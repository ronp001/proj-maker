import {AbsPath} from './path_helper'
import {StrUtils} from './str_utils'
import {LOG} from './logger'
import {execFileSync} from "child_process"
import * as _ from "lodash"
import chalk from 'chalk'
import {HygenRunner} from './hygen_runner'
import { GitLogic, GitState } from './git_logic';

export class ProjMakerError extends Error {
    constructor(public msg: string) {super(chalk.red("ERROR -- " + msg))}
    // public get message() { return chalk.red("ERROR: proj-maker - " + this.msg) }
}

export namespace ProjMakerError {
    export class TemplateDirNotSet extends ProjMakerError { constructor() { super("Template dir not set or not found ($HYGEN_TMPLS)")  } }
    export class OutputDirNotFound extends ProjMakerError { constructor(outdir:string) { super("Cannot find output directory: " + outdir)  } }
    export class OutputDirNotEmpty extends ProjMakerError { constructor(outdir:string) { super("Output directory not empty: " + outdir)  } }
    export class WorkdirNotClean extends ProjMakerError { constructor(workdir:string) { super("Workdir is not ready: " + workdir)  } }
    export class CantFindUnit extends ProjMakerError { constructor(outdir:string) { super("Cannot find unit dir: " + outdir)  } }
    export class NoGenerator extends ProjMakerError { constructor(unit_type:string) { super("Cannot find generator for unit type: " + unit_type)  } }
    export class NotInGitRepo extends ProjMakerError { constructor() { super("Must be in git repo")  } }
    export class UnexpectedState extends ProjMakerError { constructor(msg:string) { super("Unexpected state: " + msg)  } }
    export class NotProjMakerUnit extends ProjMakerError { constructor(unit_path:string, reason:string) { super(`Not a proj-maker unit (${reason}): ${unit_path}`) } }
    export class MissingCreationTag extends ProjMakerError { constructor(tag:string) { super(`Could not find unit creation tag (${tag}) in git repo`) } }
    export class TagExists extends ProjMakerError { constructor(tag:string) { super(`Creation tag (${tag}) already exists in git repo`) } }
    export class InPmBranch extends ProjMakerError { constructor(branch:string) { super(`Current branch (${branch}) appears to be a proj-maker branch`) } }
    export class NotInPmBranch extends ProjMakerError { constructor(branch:string) { super(`Current branch (${branch}) is not a proj-maker branch`) } }
    export class OpInProgress extends ProjMakerError { constructor() { super(`Please finalize the rebase operation first (resolve, then 'git add' resolved files, then 'git rebase --continue') then rerun 'proj-maker continue'`) } }
    export class StashFailed extends ProjMakerError { constructor() { super(`The 'git stash' operation did not leave a clean environment`) } }
}

type UpdateInfo = {
    unit_type : string
    unit_name : string
    orig_branch : string
    work_branch : string
    tmp_branch : string
    generator_version : number | null
}

export class ProjMaker {

    public in_extra_commit_mode : boolean = false
    public do_not_commit_after_update : boolean = false

    // The following allows running ProjMaker in a test environment
    // without worrying about having to mock the potentially dangerous functions
    // in every instance of ProjMaker.
    // To use this: override initProjMaker with a function that creates the appropriate mocks.

    public static overrideMockables(instance:ProjMaker) {
        // by default, this does nothing
    }

    private _verbose : boolean = true
    public set verbose(is_verbose:boolean) {
        this._verbose = is_verbose
    }
    constructor() {
        this.runHygen = HygenRunner.runHygen
        this.gitLogic = new GitLogic()
        ProjMaker.overrideMockables(this)
    }
    public runHygen :  ((hygen_args: string[], template_path: AbsPath, output_path: AbsPath ) => void)   // allow mocking
    public gitLogic : GitLogic  // allow mocking
    public explain = this._explain

    public get templatedir() : AbsPath {
        if ( process.env.HYGEN_TMPLS ) {
            return new AbsPath(process.env.HYGEN_TMPLS)
        } else if ( new AbsPath("./_templates").isDir ) {
            return new AbsPath("./_templates")
        }
        return new AbsPath(null)
    }
    
    public getCmdForGenerator(generator_version:number|null=null) : string {
        let cmdname = "new"
        if ( generator_version ) {
            cmdname = `new.${generator_version}`
        }
        return cmdname
    }

    public getDirForGenerator(unit_type:string, generator_version:number|null=null) : AbsPath {
        return new AbsPath(this.templatedir).add(unit_type).add(this.getCmdForGenerator(generator_version))
    }

    public getDirForUnit(unit_name:string) : AbsPath {
        let current = new AbsPath('.')
        let basename = current.basename

        if ( StrUtils.isSimilar(unit_name, basename)) {
            return current
        }

        return current.add(unit_name)
    }

    public _explain(str:string, cmd_and_params:string[]=[]) {
        // if ( !this.verbose ) return

        console.log(chalk.red(str))
        let cmd = cmd_and_params.shift()
        if ( cmd ) {
            console.log(chalk.magentaBright("running: " + cmd + " " + cmd_and_params.join(" ")))
            let result = execFileSync(cmd,cmd_and_params)
            console.log(chalk.magenta(result))
        }
    }

    private _post_msg:string|null = null
    private info(level:number, msg:string, post_msg:string|null, override_post_msg:string|null=null) {
        if ( this._post_msg ) {
            if ( override_post_msg ) {
                this._post_msg = override_post_msg
            }
            msg = this._post_msg + ". " + msg
        }
        this._post_msg = post_msg
        if ( msg != "" ) {
            console.log(chalk.green(`INFO: ${msg}`))
        }
    }
    
    
    private did_stash : boolean = false
    private unitdir : AbsPath = new AbsPath(null)
    
    private prepareEnvironment(unit_type:string, unit_name:string, create_unitdir:boolean, generator_version:number|null=null, expecting_pm_branch:boolean=false) {
        
        this.unit_name = unit_name
        this.unit_type = unit_type
        this.generator_version = generator_version
        
        if ( this.unitdir == null || !this.unitdir.isSet ) {
            this.unitdir = this.getDirForUnit(unit_name)
        }

        this.info(3,`preparing environment.  checking for unit dir (${this.unitdir.abspath})`, "unit dir found")
        if ( this.unitdir.abspath == null  ) throw new ProjMakerError.CantFindUnit(`${unit_name}`)
        if ( !create_unitdir && !this.unitdir.isDir ) throw new ProjMakerError.CantFindUnit(`${unit_name}`)

        this.info(3,`checking for templates dir (${this.templatedir})`, "template dir found")
        if ( !this.templatedir.isDir ) throw new ProjMakerError.TemplateDirNotSet

        // verify that there is a generator for this unit type
        this.info(3,`verify generator (${unit_type} v:${generator_version})`, "generator found")
        if ( !(this.getDirForGenerator(unit_type,generator_version).isDir) ) {
            throw new ProjMakerError.NoGenerator(unit_type)
        }

        let parent = this.unitdir.parent
        if ( parent.abspath == null ) {
            throw "Unexpected state: outdir does not have parent"
        }

        this.info(3,`verifying that in git repo`, "in git repo")
        // find the containing git repo
        let gitroot = parent.findUpwards(".git", true).parent
        if ( !gitroot.isDir ) {
            throw new ProjMakerError.NotInGitRepo()
        }

        // verify that the directory is indeed a git repository        
        let git = this.gitLogic
        git.project_dir = gitroot
        if ( !git.is_repo ) {
            throw new ProjMakerError.NotInGitRepo()
        }

        // make sure the current branch is not a pm- branch
        if ( !expecting_pm_branch ) {
            this.info(3,`verifying this is not a pm-* branch`, "this is not a pm-* branch")
            let current_branch = git.current_branch_or_null || ""
            if ( current_branch.startsWith("pm-") ) {
                throw new ProjMakerError.InPmBranch(current_branch)
            }
        }

        if ( create_unitdir ) {
            this.info(3,`in 'create' mode:  verifying that tag '${this.get_tagname(unit_name)}' does not exist`, "tag does not exist")
            // verify that the tag doesn't already exist
            if ( git.get_tags_matching(this.get_tagname(unit_name)).length > 0 ) {
                throw new ProjMakerError.TagExists(this.tagname)
            }

            // if the directory exists: make sure it's empty before proceeding
            if ( this.unitdir.isDir ) {
                this.info(3,`in 'create' mode: directory ${this.unitdir.abspath} exists. verifying that it is empty`, "directory is empty")
                // verify that the directory is empty
                let dircontents = this.unitdir.dirContents
                if ( dircontents == null ) {
                    throw new ProjMakerError.OutputDirNotFound(this.unitdir.toString())
                }
                if ( dircontents.length > 0 ) {
                    if ( dircontents.length != 1 || dircontents[0].basename != ".git") {
                        throw new ProjMakerError.OutputDirNotEmpty(this.unitdir.toString())
                    }
                }
            } else {
                this.info(3,`in 'create' mode:  directory ${this.unitdir.abspath} does not exist - creating`, "created directory")
                this.unitdir.mkdirs()
            }            
        } else {
            this.info(3,`not in 'create' mode:  ensuring directory ${this.unitdir.abspath} exists`, "directory exists")
            if ( !this.unitdir.isDir ) {
                throw new ProjMakerError.CantFindUnit(this.unitdir.abspath)
            }
        }

        // ensure at least one commit in the repo (we can't stash before that)
        this.info(3,'getting commit count to ensure repo has at least one commit',"got commit count")
        if ( git.commit_count == 0 ) {
            this.info(3,`repo does not have any commits - creating one.`, "empty initial commit created")
            git.commit_allowing_empty("[proj-maker autocommit (prepare_env)] initial commit")
        }
        
        this.info(3,`checking state of the repo and workdir`, "repo state acquired")
        let stash_needed = git.state != GitState.Clean
        if ( stash_needed ) {
            this.info(3,`working directory is not clean - running 'git stash'`, "stash complete")
            // this.explain("before stashing", ["git", "status"])
            this.did_stash = git.stash_with_untracked_excluding(this.unitdir.abspath)            
            this.explain(`did_stash: ${this.did_stash}`)

            this.info(3,`verifying that workdir is clean`, "workdir is clean")
            // expect the git state to be "clean" following the stash
            if ( git.state != GitState.Clean ) {
                this.explain("after stashing", ["ls", "-l", parent.abspath])
                throw new ProjMakerError.StashFailed()
            }
        }        
        this.info(3,"prepare complete",null)
    }

    public get pminfo_path() : AbsPath {
        return this.unitdir.add(".pminfo.json")
    }

    public create_pminfo(unit_type:string) {
        this.pminfo_path.saveStrSync(JSON.stringify({unit_type: unit_type}))
    }

    public async new_unit(unit_type:string, unit_name:string, generator_version:number|null=null)  {

        LOG(`type: ${unit_type}  name: ${unit_name}`)

        // identify whether the unit is the current directory, or
        // a subdirectory with a matching name
        this.unitdir = this.getDirForUnit(unit_name)
        if ( this.unitdir.abspath == null ) throw "Unexpected state: unitdir.abspath is null"

        // prepare the git environment and directory
        this.prepareEnvironment(unit_type, unit_name, true)
        if ( this.unitdir.abspath == null ) throw "Unexpected state: unitdir.abspath is null"

        try {
            // run the generator
            this.info(3,"running generator","generator execution complete")
            await this.runHygen([unit_type, this.getCmdForGenerator(generator_version), '--name', unit_name], this.templatedir, this.unitdir)
            
            // save proj-maker info about the unit
            this.info(3,"creating .pminfo.json file","file created")
            this.create_pminfo(unit_type)

            // add and commit the changes
            this.info(3,"adding and committing the new dir to git","dir committed")
            this.gitLogic.add(this.unitdir.abspath)
            this.gitLogic.commit(`[proj-maker autocommit (new_unit)] added unit '${unit_name}' of type '${unit_type}'`)

            if ( this.in_extra_commit_mode ) {
                // create an extra commit to serve as the start point for the rebase chain
                this.info(3,"creating extra commit to avoid branching at the generation point","extra commit created")
                this.gitLogic.commit_allowing_empty(`[proj-maker autocommit (new_unit, extra-commit)] empty commit after adding ${unit_name}`)
            }


        } finally {   
            // undo the stash
            if ( this.did_stash ) {
                this.info(3,"restoring directory state (git stash pop)","state restored")
                this.gitLogic.stash_pop()
            }
        }

        // tag the commit with "pmAFTER_ADDING_<unit-name>"
        this.info(3,"tagging","state restored")
        this.gitLogic.create_tag(this.get_tagname(unit_name))
    }

    private unit_name : string | null = null

    public get tagname() {
        return this.get_tagname()
    }

    public get_tagname(unit_name?:string) : string {
        if ( unit_name == null ) {
            if ( this.unit_name == null ) {
                throw "Unexpected state: get_tagname called before this.unit_name was set"
            }
            unit_name = this.unit_name
        }
        return `pmAFTER_ADDING_${unit_name}`
    }

    public cleanup_branches(switch_to:string, delete_branches:(string|null)[]) {
        this.info(3,`checking out ${switch_to}`, "branch checked out")
        this.gitLogic.checkout(switch_to)
        this.info(3,`deleting temporary branch(es): ${delete_branches.join(",")}`, "branches deleted")
        for(let branch of delete_branches) {
            if ( branch ) {
                this.gitLogic.delete_branch(branch)
            }
        }
    }


    public async continue_update() {
        this.info(3,'checking workdir state', "got state")
        this.gitLogic.auto_connect()
        if ( this.gitLogic.state == GitState.OpInProgress ) {
            throw new ProjMakerError.OpInProgress()
        }

        this.info(3,'getting current branch', "got branch")
        let branch = this.gitLogic.current_branch

        if ( !branch.startsWith("pm-")) {
            throw new ProjMakerError.NotInPmBranch(branch)
        }

        this.info(3,'get metadata for this branch', "got metadata")
        let updateinfo_str = this.gitLogic.get_branch_description(branch).join('')
        let updateinfo = JSON.parse(updateinfo_str) as UpdateInfo

        this.prepareEnvironment(updateinfo.unit_type, updateinfo.unit_name, false, updateinfo.generator_version, true)

        this.orig_branch_name = updateinfo.orig_branch
        this.work_branch_name = updateinfo.work_branch
        this.tmp_branch_name = updateinfo.tmp_branch

        await this.finalize_update()
    }

    public get generator_version_string() : string {
        if ( this.generator_version ) {
            return `${this.unit_type} v.${this.generator_version}`
        } else {
            return `${this.unit_type} (latest)`
        }
    }
    public async finalize_update() {
        let orig_branch = this.orig_branch_name
        let work_branch = this.work_branch_name

        if ( orig_branch == null ) throw new ProjMakerError.UnexpectedState("this.orig_branch_name is null")
        if ( work_branch == null ) throw new ProjMakerError.UnexpectedState("this.tmp_branch_name is null")
        if ( this.unitdir.abspath == null ) throw new ProjMakerError.UnexpectedState("this.unitdir.abspath is null")
        if ( this.unit_name == null ) throw new ProjMakerError.UnexpectedState("this.unit_name is null")

        this.info(3,"verifying that workdir is clean","workdir is clean")
        if ( this.gitLogic.state != GitState.Clean ) {
            throw new ProjMakerError.WorkdirNotClean(this.gitLogic.project_dir.abspath || "")
        }

        this.info(3,`checking out the original branch (${orig_branch})`,"checked out")
        this.gitLogic.checkout(orig_branch)

        this.info(3,`removing previous contents of ${this.unitdir.abspath}`,"contents removed")
        this.unitdir.rmrfdir(new RegExp(`${this.unit_name}`), true)
        if ( this.unitdir.isDir ) throw new ProjMakerError.UnexpectedState(`${this.unitdir.toString()} not deleted`)

        // run the generator again, and create a new 'base commit'
        this.info(3,`running the new generator in branch ${orig_branch} to create a new base commit`,"generator execution complete")
        await this.runHygen([this.unit_type||"", this.getCmdForGenerator(this.generator_version), '--name', this.unit_name], this.templatedir, this.unitdir)

        // save proj-maker info about the unit
        this.info(3,`recreating .pminfo.json`,"created")
        this.create_pminfo(this.unit_type||"")
        
        this.info(3, `committing generator output`, "committed")
        this.gitLogic.add(this.unit_name)
        this.gitLogic.commit(`[proj-maker autocommit (finalize_update)] output of ${this.generator_version_string}`)
        
        // clean the directory one more time
        this.info(3,`removing generator output before getting user modifications`,"generator output removed")
        this.unitdir.rmrfdir(new RegExp(`${this.unit_name}`), true)
        if ( this.unitdir.isDir ) throw new ProjMakerError.UnexpectedState(`${this.unitdir.toString()} not deleted`)

        // get the contents from the working branch
        this.info(3,`getting new contents for ${this.unitdir.abspath} from the branch ${work_branch}`,"contents removed")
        let relpath = this.unitdir.relativeFrom(this.gitLogic.project_dir)
        if ( relpath == null ) throw `Unexpected state: relative path from ${this.gitLogic.project_dir.toString()} to ${this.unitdir.toString()} is null`
        this.gitLogic.checkout_dir_from_branch(relpath, work_branch)

        this.info(3,`verifying directory created again`,"directory exists")
        if ( !this.unitdir.isDir ) throw `Unexpected state: ${this.unitdir.toString()} was not restored from the branch ${work_branch}`

        this.info(3,`cleaning up`,"done")
        this.cleanup_branches(orig_branch, [work_branch, this.tmp_branch_name])

        // quit if nothing changed
        this.info(3,`checking if anything has changed`,null)
        if ( this.gitLogic.state == GitState.Clean ) {
            // console.log(chalk.bold.blue("---------------------------------------------------------------"))
            console.log(chalk.bold.blue(`Applied ${this.generator_version_string}.  No user changes.`))
        }
        this.info(3, `committing changes to ${orig_branch}`, "committed")
        this.gitLogic.commit_allowing_empty(`[proj-maker autocommit (finalize_update)] applied user changes after running ${this.generator_version_string}`)

        this.info(3, `updating the tag ${this.tagname}`, "updated")
        this.gitLogic.move_tag(this.tagname, "HEAD~1")

        this.undo_stash()

        this.info(3,"",null)
    }

    private orig_branch_name : string | null = null
    private tmp_branch_name : string | null = null
    private work_branch_name : string | null = null
    private changed_branch : boolean = false
    private generator_version : number | null = null
    private unit_type : string | null = null

    public async update_unit(unit_name:string|null=null, generator_version:number|null) {
        //--------------------------------------------
        // figure out the unit name and type
        //--------------------------------------------
        if (!unit_name) {
            unit_name = new AbsPath(process.cwd()).basename
        }

        this.unit_name = unit_name
        this.generator_version = generator_version

        this.unitdir = this.getDirForUnit(unit_name)
        if ( this.unitdir.abspath == null ) throw "Unexpected state: unitdir.abspath is null"

        this.info(3,"loading .pminfo.json","loaded")
        let pminfo : any = this.pminfo_path.contentsFromJSON

        if ( !pminfo ) {
            throw new ProjMakerError.NotProjMakerUnit(this.unitdir.abspath, "can't find .pminfo.json")
        }
        
        this.info(3,"parsing .pminfo.json","parsed")
        let unit_type : string | undefined = pminfo["unit_type"]
        if ( unit_type == undefined ) {
            throw new ProjMakerError.NotProjMakerUnit(this.unitdir.abspath, ".pminfo.json does not contain 'unit_type' field")
        }

        this.unit_type = unit_type

        //--------------------------------------------
        // make sure the git environment is clean
        //--------------------------------------------
        this.prepareEnvironment(unit_type, unit_name, false, generator_version)


        try {
            // verify that the tag we're looking for exists
            this.info(3,`ensure the tag ${this.tagname} is in the repo`,"tag found")
            let matching_tags = this.gitLogic.get_tags_matching(this.get_tagname(unit_name))
            if ( matching_tags.length == 0 || matching_tags[0] != this.get_tagname(unit_name) ) {
                throw new ProjMakerError.MissingCreationTag(this.get_tagname(unit_name))
            }

            // remember the current branch
            this.info(3,`making note of the current branch`,"branch noted")
            this.orig_branch_name = this.gitLogic.current_branch
            
            let tag_after_old_version = `${this.get_tagname(unit_name)}`
            let parent_count = this.in_extra_commit_mode ? 2 : 1
            let tag_before_old_version = `${this.get_tagname(unit_name)}~${parent_count}`
            this.tmp_branch_name = `pm-before-updating-${unit_name}`
            this.work_branch_name = `pm-updating-${unit_name}`

            // create a temporary branch from right before the tag
            this.info(3,`creating temporary branch: ${this.tmp_branch_name}`,"branch created")
            this.gitLogic.create_branch(this.tmp_branch_name, tag_before_old_version)
            this.changed_branch = true

            
            this.info(3,`checking if ${this.unitdir.abspath} still exists after branch creation`,"dir does not exist (this is probably the first update)")
            if ( this.unitdir.isDir) {
                this.info(3,`removing previous contents of ${this.unitdir.abspath}`,"contents removed", "dir exists (likely updated before)")
                this.unitdir.rmrfdir(new RegExp(`${unit_name}`))
            }

            // run the requested version of the generator
            this.info(3,`running the generator`,"generator execution complete")
            await this.runHygen([unit_type, this.getCmdForGenerator(generator_version), '--name', unit_name], this.templatedir, this.unitdir)

            this.explain("after generator", ["ls", "-lR", this.unitdir.abspath])
            this.explain("after generator", ["cat", this.unitdir.abspath + "/dist/hithere.js"])

            // save proj-maker info about the unit
            this.info(3,`recreating .pminfo.json`,"created")
            this.create_pminfo(unit_type)

            // // quit if nothing changed
            this.info(3,`checking if anything has changed`,null)
            if ( this.gitLogic.state == GitState.Clean ) {
                console.log(chalk.bold.blue("---------------------------------------------------------------"))
                console.log(chalk.bold.blue("New generator did not change anything. Rewinding the operation"))
                console.log(chalk.bold.blue("---------------------------------------------------------------"))
                
                // let out = execFileSync('cat',["/tmp/1b/HiThere/dist/hithere.js"])
                // console.log(chalk.red(out))
                // process.exit(0)

                this.cleanup_branches(this.orig_branch_name, [this.tmp_branch_name])
                this.info(3,"",null)
                return
            }

            // add and commit the newly created unit
            this.info(3,`adding and committing new contents`,"committed")
            this.gitLogic.add(this.unitdir.abspath)
            let version_str = generator_version ? `v:${generator_version}` : "latest version"
            this.gitLogic.commit(`[proj-maker autocommit (update_unit in tmp_branch)] recreated unit '${unit_name}' using '${unit_type}' ${version_str}`)
            
            // create the target branch (branching off the orig_branch HEAD)
            this.info(3,`creating another branch (${this.work_branch_name})`,"branch created")
            this.gitLogic.create_branch(this.work_branch_name, this.orig_branch_name)
            
            // store metadata in the new branch
            this.info(3,`saving metadata about this operation in the branch (${this.work_branch_name})`,"metadata saved")
            let updateinfo : UpdateInfo = {
                unit_type : unit_type,
                unit_name : unit_name,
                orig_branch : this.orig_branch_name,
                work_branch : this.work_branch_name,
                tmp_branch : this.tmp_branch_name,
                generator_version : generator_version
            }
            
            this.gitLogic.set_branch_description(this.work_branch_name, JSON.stringify(updateinfo))

            this.explain("before rebasing", ["ls", "-lR", this.unitdir.abspath])
            // this.explain("before rebasing", ["cat", this.unitdir.abspath + "/dist/hithere.js"])

            // rebase the target branch onto the temporary one (this operation will fail if there are merge conflicts)
            this.info(3,`rebasing the new (${this.work_branch_name}) onto the temp one (${this.tmp_branch_name})`,"branch rebased")
            try {
                this.gitLogic.rebase_branch_from_point_onto(this.work_branch_name, tag_after_old_version, this.tmp_branch_name)
                this.explain("after rebasing", ["ls", "-lR", this.unitdir.abspath])
                // this.explain("after rebasing", ["cat", this.unitdir.abspath + "/dist/hithere.js"])
            } catch ( e ) {
                this.info(3,`checking why the operation failed`,"reason identified", "branch operation did not complete")
                if ( this.gitLogic.state == GitState.OpInProgress) {
                    console.log(chalk.bold.blue("---------------------------------------------------------------"))
                    console.log(chalk.bold.blue("Merge conflicts detected.  Please resolve the conflicts and run 'proj-maker continue'"))
                    console.log(chalk.bold.blue("---------------------------------------------------------------"))
                    return
                } else {
                    throw "Unknown failure reason"
                }
            }

            // finalize he operation
            this.finalize_update()

        } finally {   
            this.undo_stash()
        }

    }

    private undo_stash() {
        if ( this.did_stash ) {
            if ( this.changed_branch ) {
                console.log(chalk.bold.blue(`Note: did not undo 'stash' because stash performed in the branch ${this.orig_branch_name}`))
            } else {
                this.did_stash = false
                this.info(3,`undoing the previous stash`,"stash pop complete")
                this.gitLogic.stash_pop()
            }
        }
    }
}