import {AbsPath} from './path_helper'
import {StrUtils} from './str_utils'
import {LOG} from './logger'
import {execFileSync} from "child_process"
import * as _ from "lodash"
import chalk from 'chalk'
import {HygenRunner} from './hygen_runner'
import { GitLogic } from './git_logic';

const APP_VERSION = "0.2.0"

export class ProjMakerError extends Error {
    constructor(public msg: string) {super(chalk.red("ERROR -- " + msg))}
    // public get message() { return chalk.red("ERROR: proj-maker - " + this.msg) }
}

export namespace ProjMakerError {
    export class TemplateDirNotSet extends ProjMakerError { constructor() { super("Template dir not set or not found ($HYGEN_TMPLS)")  } }
    export class OutputDirNotFound extends ProjMakerError { constructor(outdir:string) { super("Cannot find output directory: " + outdir)  } }
    export class OutputDirNotEmpty extends ProjMakerError { constructor(outdir:string) { super("Output directory not empty: " + outdir)  } }
    export class CantFindUnit extends ProjMakerError { constructor(outdir:string) { super("Cannot find unit dir: " + outdir)  } }
    export class NoGenerator extends ProjMakerError { constructor(unit_type:string) { super("Cannot find generator for unit type: " + unit_type)  } }
    export class NotInGitRepo extends ProjMakerError { constructor() { super("Must be in git repo")  } }
    export class UnexpectedState extends ProjMakerError { constructor(msg:string) { super("Unexpected state: " + msg)  } }
    export class NotProjMakerUnit extends ProjMakerError { constructor(unit_path:string, reason:string) { super(`Not a proj-maker unit (${reason}): ${unit_path}`) } }
    export class MissingCreationTag extends ProjMakerError { constructor(tag:string) { super(`Could not find unit creation tag (${tag}) in git repo`) } }
    export class TagExists extends ProjMakerError { constructor(tag:string) { super(`Creation tag (${tag}) already exists in git repo`) } }
}

export class ProjMaker {

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
        if ( !this.verbose ) return

        console.log(chalk.red(str))
        let cmd = cmd_and_params.shift()
        if ( cmd ) {
            console.log(chalk.magentaBright("running: " + cmd + " " + cmd_and_params.join(" ")))
            let result = execFileSync(cmd,cmd_and_params)
            console.log(chalk.magenta(result))
        }
    }

    
    
    private did_stash : boolean = false
    private unitdir : AbsPath = new AbsPath(null)
    
    private prepareEnvironment(unit_type:string, unit_name:string, create_unitdir:boolean, generator_version:number|null=null) {

        this.unit_name = unit_name

        if ( this.unitdir.abspath == null  ) throw new ProjMakerError.CantFindUnit(`${unit_name}`)
        if ( !create_unitdir && !this.unitdir.isDir ) throw new ProjMakerError.CantFindUnit(`${unit_name}`)
        if ( !this.templatedir.isDir ) throw new ProjMakerError.TemplateDirNotSet

        // verify that there is a generator for this unit type
        if ( !(this.getDirForGenerator(unit_type,generator_version).isDir) ) {
            throw new ProjMakerError.NoGenerator(unit_type)
        }

        let parent = this.unitdir.parent
        if ( parent.abspath == null ) {
            throw "Unexpected state: outdir does not have parent"
        }

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


        if ( create_unitdir ) {
            // verify that the tag doesn't already exist
            if ( git.get_tags_matching(this.get_tagname(unit_name)).length > 0 ) {
                throw new ProjMakerError.TagExists(this.tagname)
            }

            // if the directory exists: make sure it's empty before proceeding
            if ( this.unitdir.isDir ) {
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
                this.unitdir.mkdirs()
            }            
        } else {
            if ( !this.unitdir.isDir ) {
                throw new ProjMakerError.CantFindUnit(this.unitdir.abspath)
            }
        }

        // ensure at least one commit in the repo (we can't stash before that)
        if ( git.commit_count == 0 ) {
            git.empty_commit("[proj-maker autocommit] initial commit")
        }

        // do a 'git stash' before running the generator
        this.explain("before stashing", ["ls", "-l", parent.abspath])
        this.explain("before stashing", ["git", "status"])
        this.did_stash = git.stash_with_untracked_excluding(this.unitdir.abspath)
        this.explain(`did_stash: ${this.did_stash}`)
        this.explain("after stashing", ["ls", "-l", parent.abspath])
        
    }

    public get pminfo_path() : AbsPath {
        return this.unitdir.add(".pminfo.json")
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
            await this.runHygen([unit_type, this.getCmdForGenerator(generator_version), '--name', unit_name], this.templatedir, this.unitdir)
            
            // save proj-maker info about the unit
            this.pminfo_path.saveStrSync(JSON.stringify({unit_type: unit_type}))

            // add and commit the changes
            this.gitLogic.add(this.unitdir.abspath)
            this.gitLogic.commit(`[proj-maker autocommit] added unit '${unit_name}' of type '${unit_type}'`)


        } finally {   
            // undo the stash
            if ( this.did_stash ) {
                this.gitLogic.stash_pop()
            }
        }

        // tag the commit with "pmAFTER_ADDING_<unit-name>"
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

    public async update_unit(unit_name?:string) {
        //--------------------------------------------
        // figure out the unit name and type
        //--------------------------------------------
        if (!unit_name) {
            unit_name = new AbsPath(process.cwd()).basename
        }

        this.unit_name = unit_name

        this.unitdir = this.getDirForUnit(unit_name)
        if ( this.unitdir.abspath == null ) throw "Unexpected state: unitdir.abspath is null"

        let pminfo : any = this.pminfo_path.contentsFromJSON

        if ( !pminfo ) {
            throw new ProjMakerError.NotProjMakerUnit(this.unitdir.abspath, "can't find .pminfo.json")
        }
        
        let unit_type : string | undefined = pminfo["unit_type"]
        if ( unit_type == undefined ) {
            throw new ProjMakerError.NotProjMakerUnit(this.unitdir.abspath, ".pminfo.json does not contain 'unit_type' field")
        }

        //--------------------------------------------
        // make sure the git environment is clean
        //--------------------------------------------
        this.prepareEnvironment(unit_type, unit_name, false)

        let orig_branch_name = null

        try {
            // verify that the tag we're looking for exists
            let matching_tags = this.gitLogic.get_tags_matching(this.get_tagname(unit_name))
            if ( matching_tags.length == 0 || matching_tags[0] != this.get_tagname(unit_name) ) {
                throw new ProjMakerError.MissingCreationTag(this.get_tagname(unit_name))
            }

            // remember the current branch
            orig_branch_name = this.gitLogic.current_branch
            
            let tag_after_old_version = `${this.get_tagname(unit_name)}`
            let tag_before_old_version = `${this.get_tagname(unit_name)}~1`
            let tmp_branch_name = `tmp-pm-updating-${unit_name}`
            let target_branch_name = `pm-updating-${unit_name}`

            // create a temporary branch from right before the tag
            this.gitLogic.create_branch(tmp_branch_name, tag_before_old_version)

            // defensive programming:  verify that the unit directory has disappeared
            if ( this.unitdir.isDir && this.unitdir.dirContents && this.unitdir.dirContents.length > 0 ) {
                console.log(chalk.bgRedBright("WARNING: git current branch is now " + tmp_branch_name))
                throw new ProjMakerError.UnexpectedState(`${this.unitdir.abspath} not empty after creating branch from tag: ${tag_before_old_version}`)
            }

            // run the latest version of the generator
            await this.runHygen([unit_type, 'new', '--name', unit_name], this.templatedir, this.unitdir)
            
            // add and commit the newly created unit
            this.gitLogic.add(this.unitdir.abspath)
            this.gitLogic.commit(`[proj-maker autocommit] recreated unit '${unit_name}' of type '${unit_type}' (NEW VERSION of '${unit_type}')`)
            
            // create the target branch (branching off the orig_branch HEAD)
            this.gitLogic.create_branch(target_branch_name, orig_branch_name)
            
            // rebase the target branch onto the temporary one
            this.gitLogic.rebase_branch_from_point_onto(target_branch_name, tag_after_old_version, tmp_branch_name)
        } finally {   
            // undo the stash
            if ( this.did_stash ) {
                this.gitLogic.stash_pop()
            }
        }

    }
}