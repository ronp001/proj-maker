"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_helper_1 = require("./path_helper");
const str_utils_1 = require("./str_utils");
const logger_1 = require("./logger");
const child_process_1 = require("child_process");
const chalk_1 = require("chalk");
const hygen_runner_1 = require("./hygen_runner");
const git_logic_1 = require("./git_logic");
const APP_VERSION = "0.2.0";
class ProjMakerError extends Error {
    constructor(msg) {
        super(chalk_1.default.red("ERROR -- " + msg));
        this.msg = msg;
    }
}
exports.ProjMakerError = ProjMakerError;
(function (ProjMakerError) {
    class TemplateDirNotSet extends ProjMakerError {
        constructor() { super("Template dir not set or not found ($HYGEN_TMPLS)"); }
    }
    ProjMakerError.TemplateDirNotSet = TemplateDirNotSet;
    class OutputDirNotFound extends ProjMakerError {
        constructor(outdir) { super("Cannot find output directory: " + outdir); }
    }
    ProjMakerError.OutputDirNotFound = OutputDirNotFound;
    class OutputDirNotEmpty extends ProjMakerError {
        constructor(outdir) { super("Output directory not empty: " + outdir); }
    }
    ProjMakerError.OutputDirNotEmpty = OutputDirNotEmpty;
    class WorkdirNotClean extends ProjMakerError {
        constructor(workdir) { super("Workdir is not ready: " + workdir); }
    }
    ProjMakerError.WorkdirNotClean = WorkdirNotClean;
    class CantFindUnit extends ProjMakerError {
        constructor(outdir) { super("Cannot find unit dir: " + outdir); }
    }
    ProjMakerError.CantFindUnit = CantFindUnit;
    class NoGenerator extends ProjMakerError {
        constructor(unit_type) { super("Cannot find generator for unit type: " + unit_type); }
    }
    ProjMakerError.NoGenerator = NoGenerator;
    class NotInGitRepo extends ProjMakerError {
        constructor() { super("Must be in git repo"); }
    }
    ProjMakerError.NotInGitRepo = NotInGitRepo;
    class UnexpectedState extends ProjMakerError {
        constructor(msg) { super("Unexpected state: " + msg); }
    }
    ProjMakerError.UnexpectedState = UnexpectedState;
    class NotProjMakerUnit extends ProjMakerError {
        constructor(unit_path, reason) { super(`Not a proj-maker unit (${reason}): ${unit_path}`); }
    }
    ProjMakerError.NotProjMakerUnit = NotProjMakerUnit;
    class MissingCreationTag extends ProjMakerError {
        constructor(tag) { super(`Could not find unit creation tag (${tag}) in git repo`); }
    }
    ProjMakerError.MissingCreationTag = MissingCreationTag;
    class TagExists extends ProjMakerError {
        constructor(tag) { super(`Creation tag (${tag}) already exists in git repo`); }
    }
    ProjMakerError.TagExists = TagExists;
    class InPmBranch extends ProjMakerError {
        constructor(branch) { super(`Current branch (${branch}) appears to be a proj-maker branch`); }
    }
    ProjMakerError.InPmBranch = InPmBranch;
    class NotInPmBranch extends ProjMakerError {
        constructor(branch) { super(`Current branch (${branch}) is not a proj-maker branch`); }
    }
    ProjMakerError.NotInPmBranch = NotInPmBranch;
    class OpInProgress extends ProjMakerError {
        constructor() { super(`Please finalize the rebase operation first (resolve, then 'git add' resolved files, then 'git rebase --continue') then rerun 'proj-maker continue'`); }
    }
    ProjMakerError.OpInProgress = OpInProgress;
    class StashFailed extends ProjMakerError {
        constructor() { super(`The 'git stash' operation did not leave a clean environment`); }
    }
    ProjMakerError.StashFailed = StashFailed;
})(ProjMakerError = exports.ProjMakerError || (exports.ProjMakerError = {}));
class ProjMaker {
    constructor() {
        this.in_extra_commit_mode = false;
        this.do_not_commit_after_update = false;
        this._verbose = true;
        this.explain = this._explain;
        this._post_msg = null;
        this.did_stash = false;
        this.unitdir = new path_helper_1.AbsPath(null);
        this.unit_name = null;
        this.orig_branch_name = null;
        this.tmp_branch_name = null;
        this.work_branch_name = null;
        this.changed_branch = false;
        this.generator_version = null;
        this.unit_type = null;
        this.runHygen = hygen_runner_1.HygenRunner.runHygen;
        this.gitLogic = new git_logic_1.GitLogic();
        ProjMaker.overrideMockables(this);
    }
    // The following allows running ProjMaker in a test environment
    // without worrying about having to mock the potentially dangerous functions
    // in every instance of ProjMaker.
    // To use this: override initProjMaker with a function that creates the appropriate mocks.
    static overrideMockables(instance) {
        // by default, this does nothing
    }
    set verbose(is_verbose) {
        this._verbose = is_verbose;
    }
    get templatedir() {
        if (process.env.HYGEN_TMPLS) {
            return new path_helper_1.AbsPath(process.env.HYGEN_TMPLS);
        }
        else if (new path_helper_1.AbsPath("./_templates").isDir) {
            return new path_helper_1.AbsPath("./_templates");
        }
        return new path_helper_1.AbsPath(null);
    }
    getCmdForGenerator(generator_version = null) {
        let cmdname = "new";
        if (generator_version) {
            cmdname = `new.${generator_version}`;
        }
        return cmdname;
    }
    getDirForGenerator(unit_type, generator_version = null) {
        return new path_helper_1.AbsPath(this.templatedir).add(unit_type).add(this.getCmdForGenerator(generator_version));
    }
    getDirForUnit(unit_name) {
        let current = new path_helper_1.AbsPath('.');
        let basename = current.basename;
        if (str_utils_1.StrUtils.isSimilar(unit_name, basename)) {
            return current;
        }
        return current.add(unit_name);
    }
    _explain(str, cmd_and_params = []) {
        // if ( !this.verbose ) return
        console.log(chalk_1.default.red(str));
        let cmd = cmd_and_params.shift();
        if (cmd) {
            console.log(chalk_1.default.magentaBright("running: " + cmd + " " + cmd_and_params.join(" ")));
            let result = child_process_1.execFileSync(cmd, cmd_and_params);
            console.log(chalk_1.default.magenta(result));
        }
    }
    info(level, msg, post_msg, override_post_msg = null) {
        if (this._post_msg) {
            if (override_post_msg) {
                this._post_msg = override_post_msg;
            }
            msg = this._post_msg + ". " + msg;
        }
        this._post_msg = post_msg;
        if (msg != "") {
            console.log(chalk_1.default.green(`INFO: ${msg}`));
        }
    }
    prepareEnvironment(unit_type, unit_name, create_unitdir, generator_version = null, expecting_pm_branch = false) {
        this.unit_name = unit_name;
        this.unit_type = unit_type;
        this.generator_version = generator_version;
        if (this.unitdir == null || !this.unitdir.isSet) {
            this.unitdir = this.getDirForUnit(unit_name);
        }
        this.info(3, `preparing environment.  checking for unit dir (${this.unitdir.abspath})`, "unit dir found");
        if (this.unitdir.abspath == null)
            throw new ProjMakerError.CantFindUnit(`${unit_name}`);
        if (!create_unitdir && !this.unitdir.isDir)
            throw new ProjMakerError.CantFindUnit(`${unit_name}`);
        this.info(3, `checking for templates dir (${this.templatedir})`, "template dir found");
        if (!this.templatedir.isDir)
            throw new ProjMakerError.TemplateDirNotSet;
        // verify that there is a generator for this unit type
        this.info(3, `verify generator (${unit_type} v:${generator_version})`, "generator found");
        if (!(this.getDirForGenerator(unit_type, generator_version).isDir)) {
            throw new ProjMakerError.NoGenerator(unit_type);
        }
        let parent = this.unitdir.parent;
        if (parent.abspath == null) {
            throw "Unexpected state: outdir does not have parent";
        }
        this.info(3, `verifying that in git repo`, "in git repo");
        // find the containing git repo
        let gitroot = parent.findUpwards(".git", true).parent;
        if (!gitroot.isDir) {
            throw new ProjMakerError.NotInGitRepo();
        }
        // verify that the directory is indeed a git repository        
        let git = this.gitLogic;
        git.project_dir = gitroot;
        if (!git.is_repo) {
            throw new ProjMakerError.NotInGitRepo();
        }
        // make sure the current branch is not a pm- branch
        if (!expecting_pm_branch) {
            this.info(3, `verifying this is not a pm-* branch`, "this is not a pm-* branch");
            let current_branch = git.current_branch_or_null || "";
            if (current_branch.startsWith("pm-")) {
                throw new ProjMakerError.InPmBranch(current_branch);
            }
        }
        if (create_unitdir) {
            this.info(3, `in 'create' mode:  verifying that tag '${this.get_tagname(unit_name)}' does not exist`, "tag does not exist");
            // verify that the tag doesn't already exist
            if (git.get_tags_matching(this.get_tagname(unit_name)).length > 0) {
                throw new ProjMakerError.TagExists(this.tagname);
            }
            // if the directory exists: make sure it's empty before proceeding
            if (this.unitdir.isDir) {
                this.info(3, `in 'create' mode: directory ${this.unitdir.abspath} exists. verifying that it is empty`, "directory is empty");
                // verify that the directory is empty
                let dircontents = this.unitdir.dirContents;
                if (dircontents == null) {
                    throw new ProjMakerError.OutputDirNotFound(this.unitdir.toString());
                }
                if (dircontents.length > 0) {
                    if (dircontents.length != 1 || dircontents[0].basename != ".git") {
                        throw new ProjMakerError.OutputDirNotEmpty(this.unitdir.toString());
                    }
                }
            }
            else {
                this.info(3, `in 'create' mode:  directory ${this.unitdir.abspath} does not exist - creating`, "created directory");
                this.unitdir.mkdirs();
            }
        }
        else {
            this.info(3, `not in 'create' mode:  ensuring directory ${this.unitdir.abspath} exists`, "directory exists");
            if (!this.unitdir.isDir) {
                throw new ProjMakerError.CantFindUnit(this.unitdir.abspath);
            }
        }
        // ensure at least one commit in the repo (we can't stash before that)
        this.info(3, 'getting commit count to ensure repo has at least one commit', "got commit count");
        if (git.commit_count == 0) {
            this.info(3, `repo does not have any commits - creating one.`, "empty initial commit created");
            git.commit_allowing_empty("[proj-maker autocommit] initial commit");
        }
        this.info(3, `checking state of the repo and workdir`, "repo state acquired");
        let stash_needed = git.state != git_logic_1.GitState.Clean;
        if (stash_needed) {
            this.info(3, `working directory is not clean - running 'git stash'`, "stash complete");
            // this.explain("before stashing", ["git", "status"])
            this.did_stash = git.stash_with_untracked_excluding(this.unitdir.abspath);
            this.explain(`did_stash: ${this.did_stash}`);
            this.info(3, `verifying that workdir is clean`, "workdir is clean");
            // expect the git state to be "clean" following the stash
            if (git.state != git_logic_1.GitState.Clean) {
                this.explain("after stashing", ["ls", "-l", parent.abspath]);
                throw new ProjMakerError.StashFailed();
            }
        }
        this.info(3, "prepare complete", null);
    }
    get pminfo_path() {
        return this.unitdir.add(".pminfo.json");
    }
    create_pminfo(unit_type) {
        this.pminfo_path.saveStrSync(JSON.stringify({ unit_type: unit_type }));
    }
    new_unit(unit_type, unit_name, generator_version = null) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.LOG(`type: ${unit_type}  name: ${unit_name}`);
            // identify whether the unit is the current directory, or
            // a subdirectory with a matching name
            this.unitdir = this.getDirForUnit(unit_name);
            if (this.unitdir.abspath == null)
                throw "Unexpected state: unitdir.abspath is null";
            // prepare the git environment and directory
            this.prepareEnvironment(unit_type, unit_name, true);
            if (this.unitdir.abspath == null)
                throw "Unexpected state: unitdir.abspath is null";
            try {
                // run the generator
                this.info(3, "running generator", "generator execution complete");
                yield this.runHygen([unit_type, this.getCmdForGenerator(generator_version), '--name', unit_name], this.templatedir, this.unitdir);
                // save proj-maker info about the unit
                this.info(3, "creating .pminfo.json file", "file created");
                this.create_pminfo(unit_type);
                // add and commit the changes
                this.info(3, "adding and committing the new dir to git", "dir committed");
                this.gitLogic.add(this.unitdir.abspath);
                this.gitLogic.commit(`[proj-maker autocommit] added unit '${unit_name}' of type '${unit_type}'`);
                if (this.in_extra_commit_mode) {
                    // create an extra commit to serve as the start point for the rebase chain
                    this.info(3, "creating extra commit to avoid branching at the generation point", "extra commit created");
                    this.gitLogic.commit_allowing_empty(`[proj-maker autocommit] empty commit after adding ${unit_name}`);
                }
            }
            finally {
                // undo the stash
                if (this.did_stash) {
                    this.info(3, "restoring directory state (git stash pop)", "state restored");
                    this.gitLogic.stash_pop();
                }
            }
            // tag the commit with "pmAFTER_ADDING_<unit-name>"
            this.info(3, "tagging", "state restored");
            this.gitLogic.create_tag(this.get_tagname(unit_name));
        });
    }
    get tagname() {
        return this.get_tagname();
    }
    get_tagname(unit_name) {
        if (unit_name == null) {
            if (this.unit_name == null) {
                throw "Unexpected state: get_tagname called before this.unit_name was set";
            }
            unit_name = this.unit_name;
        }
        return `pmAFTER_ADDING_${unit_name}`;
    }
    cleanup_branches(switch_to, delete_branches) {
        this.info(3, `checking out ${switch_to}`, "branch checked out");
        this.gitLogic.checkout(switch_to);
        this.info(3, `deleting temporary branch(es): ${delete_branches.join(",")}`, "branches deleted");
        for (let branch of delete_branches) {
            if (branch) {
                this.gitLogic.delete_branch(branch);
            }
        }
    }
    continue_update() {
        this.info(3, 'checking workdir state', "got state");
        this.gitLogic.auto_connect();
        if (this.gitLogic.state == git_logic_1.GitState.OpInProgress) {
            throw new ProjMakerError.OpInProgress();
        }
        this.info(3, 'getting current branch', "got branch");
        let branch = this.gitLogic.current_branch;
        if (!branch.startsWith("pm-")) {
            throw new ProjMakerError.NotInPmBranch(branch);
        }
        this.info(3, 'get metadata for this branch', "got metadata");
        let updateinfo_str = this.gitLogic.get_branch_description(branch).join('');
        let updateinfo = JSON.parse(updateinfo_str);
        this.prepareEnvironment(updateinfo.unit_type, updateinfo.unit_name, false, updateinfo.generator_version, true);
        this.orig_branch_name = updateinfo.orig_branch;
        this.work_branch_name = updateinfo.work_branch;
        this.tmp_branch_name = updateinfo.tmp_branch;
        this.finalize_update();
    }
    finalize_update() {
        let orig_branch = this.orig_branch_name;
        let work_branch = this.work_branch_name;
        if (orig_branch == null)
            throw new ProjMakerError.UnexpectedState("this.orig_branch_name is null");
        if (work_branch == null)
            throw new ProjMakerError.UnexpectedState("this.tmp_branch_name is null");
        if (this.unitdir.abspath == null)
            throw new ProjMakerError.UnexpectedState("this.unitdir.abspath is null");
        if (this.unit_name == null)
            throw new ProjMakerError.UnexpectedState("this.unit_name is null");
        this.info(3, "verifying that workdir is clean", "workdir is clean");
        if (this.gitLogic.state != git_logic_1.GitState.Clean) {
            throw new ProjMakerError.WorkdirNotClean(this.gitLogic.project_dir.abspath || "");
        }
        this.info(3, `checking out the original branch (${orig_branch})`, "checked out");
        this.gitLogic.checkout(orig_branch);
        this.info(3, `removing previous contents of ${this.unitdir.abspath}`, "contents removed");
        this.unitdir.rmrfdir(new RegExp(`${this.unit_name}`), true);
        if (this.unitdir.isDir)
            throw new ProjMakerError.UnexpectedState(`${this.unitdir.toString()} not deleted`);
        this.info(3, `creating a temporary commit after previous contents removed`, "committed");
        this.gitLogic.add(this.unitdir.abspath);
        this.gitLogic.commit(`[proj-maker autocommit] removed dir [${this.unit_name}] before adding new version (allows subsequent updates)`);
        this.info(3, `getting new contents for ${this.unitdir.abspath} from the branch ${work_branch}`, "contents removed");
        let relpath = this.unitdir.relativeFrom(this.gitLogic.project_dir);
        if (relpath == null)
            throw `Unexpected state: relative path from ${this.gitLogic.project_dir.toString()} to ${this.unitdir.toString()} is null`;
        this.gitLogic.checkout_dir_from_branch(relpath, work_branch);
        this.info(3, `verifying directory created again`, "directory exists");
        if (!this.unitdir.isDir)
            throw `Unexpected state: ${this.unitdir.toString()} was not restored from the branch ${work_branch}`;
        this.info(3, `cleaning up`, "done");
        this.cleanup_branches(orig_branch, [work_branch, this.tmp_branch_name]);
        // quit if nothing changed
        this.info(3, `checking if anything has changed`, null);
        if (this.gitLogic.state == git_logic_1.GitState.Clean) {
            console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
            console.log(chalk_1.default.bold.blue("Update operation did not change anything"));
            console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
        }
        else if (this.do_not_commit_after_update) {
            console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
            console.log(chalk_1.default.bold.blue(`Update operation complete. Don't forget to commit and update the tag ${this.tagname}`));
            console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
        }
        else {
            this.info(3, `committing changes to ${orig_branch}`, "committed");
            let version_str = this.generator_version ? `v.${this.generator_version}` : "latest version";
            this.gitLogic.commit(`[proj-maker autocommit] recreated unit '${this.unit_name}' using '${this.unit_type}' ${version_str}`);
            this.info(3, `updating the tag ${this.tagname}`, "updated");
            this.gitLogic.move_tag_to_head(this.tagname);
        }
        this.undo_stash();
        this.info(3, "", null);
    }
    update_unit(unit_name = null, generator_version) {
        return __awaiter(this, void 0, void 0, function* () {
            //--------------------------------------------
            // figure out the unit name and type
            //--------------------------------------------
            if (!unit_name) {
                unit_name = new path_helper_1.AbsPath(process.cwd()).basename;
            }
            this.unit_name = unit_name;
            this.generator_version = generator_version;
            this.unitdir = this.getDirForUnit(unit_name);
            if (this.unitdir.abspath == null)
                throw "Unexpected state: unitdir.abspath is null";
            this.info(3, "loading .pminfo.json", "loaded");
            let pminfo = this.pminfo_path.contentsFromJSON;
            if (!pminfo) {
                throw new ProjMakerError.NotProjMakerUnit(this.unitdir.abspath, "can't find .pminfo.json");
            }
            this.info(3, "parsing .pminfo.json", "parsed");
            let unit_type = pminfo["unit_type"];
            if (unit_type == undefined) {
                throw new ProjMakerError.NotProjMakerUnit(this.unitdir.abspath, ".pminfo.json does not contain 'unit_type' field");
            }
            this.unit_type = unit_type;
            //--------------------------------------------
            // make sure the git environment is clean
            //--------------------------------------------
            this.prepareEnvironment(unit_type, unit_name, false, generator_version);
            try {
                // verify that the tag we're looking for exists
                this.info(3, `ensure the tag ${this.tagname} is in the repo`, "tag found");
                let matching_tags = this.gitLogic.get_tags_matching(this.get_tagname(unit_name));
                if (matching_tags.length == 0 || matching_tags[0] != this.get_tagname(unit_name)) {
                    throw new ProjMakerError.MissingCreationTag(this.get_tagname(unit_name));
                }
                // remember the current branch
                this.info(3, `making note of the current branch`, "branch noted");
                this.orig_branch_name = this.gitLogic.current_branch;
                let tag_after_old_version = `${this.get_tagname(unit_name)}`;
                let parent_count = this.in_extra_commit_mode ? 2 : 1;
                let tag_before_old_version = `${this.get_tagname(unit_name)}~${parent_count}`;
                this.tmp_branch_name = `pm-before-updating-${unit_name}`;
                this.work_branch_name = `pm-updating-${unit_name}`;
                // create a temporary branch from right before the tag
                this.info(3, `creating temporary branch: ${this.tmp_branch_name}`, "branch created");
                this.gitLogic.create_branch(this.tmp_branch_name, tag_before_old_version);
                this.changed_branch = true;
                const EXPECTING_DIR_TO_EXIST = false;
                if (EXPECTING_DIR_TO_EXIST) {
                    // defensive programming:  verify that the unit directory exists
                    this.info(3, `making sure unit dir ${this.unitdir.abspath} still exists after branch creation`, "dir exists");
                    if (!this.unitdir.isDir) {
                        console.log(chalk_1.default.bgRedBright("WARNING: git current branch is now " + this.tmp_branch_name));
                        throw new ProjMakerError.UnexpectedState(`${this.unitdir.abspath} does not exist after creating branch from tag: ${tag_after_old_version}`);
                    }
                    // remove the unitdir contents
                    this.info(3, `removing previous contents of ${this.unitdir.abspath}`, "contents removed");
                    this.unitdir.rmrfdir(new RegExp(`${unit_name}`));
                }
                else {
                    // defensive programming:  verify that the unit directory does not exist
                    this.info(3, `making sure unit dir ${this.unitdir.abspath} does not exist after branch creation`, "dir does not exist");
                    if (this.unitdir.isDir) {
                        console.log(chalk_1.default.bgRedBright("WARNING: git current branch is now " + this.tmp_branch_name));
                        throw new ProjMakerError.UnexpectedState(`${this.unitdir.abspath} exists after creating branch from tag: ${tag_after_old_version}`);
                    }
                }
                // run the latest version of the generator
                this.info(3, `running the generator`, "generator execution complete");
                yield this.runHygen([unit_type, this.getCmdForGenerator(generator_version), '--name', unit_name], this.templatedir, this.unitdir);
                this.explain("after generator", ["ls", "-lR", this.unitdir.abspath]);
                this.explain("after generator", ["cat", this.unitdir.abspath + "/dist/hithere.js"]);
                // save proj-maker info about the unit
                this.info(3, `recreating .pminfo.json`, "created");
                this.create_pminfo(unit_type);
                // // quit if nothing changed
                this.info(3, `checking if anything has changed`, null);
                if (this.gitLogic.state == git_logic_1.GitState.Clean) {
                    console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
                    console.log(chalk_1.default.bold.blue("New generator did not change anything. Rewinding the operation"));
                    console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
                    // let out = execFileSync('cat',["/tmp/1b/HiThere/dist/hithere.js"])
                    // console.log(chalk.red(out))
                    // process.exit(0)
                    this.cleanup_branches(this.orig_branch_name, [this.tmp_branch_name]);
                    this.info(3, "", null);
                    return;
                }
                // add and commit the newly created unit
                this.info(3, `adding and committing new contents`, "committed");
                this.gitLogic.add(this.unitdir.abspath);
                let version_str = generator_version ? `v:${generator_version}` : "latest version";
                this.gitLogic.commit(`[proj-maker autocommit] recreated unit '${unit_name}' using '${unit_type}' ${version_str}`);
                // create the target branch (branching off the orig_branch HEAD)
                this.info(3, `creating another branch (${this.work_branch_name})`, "branch created");
                this.gitLogic.create_branch(this.work_branch_name, this.orig_branch_name);
                // store metadata in the new branch
                this.info(3, `saving metadata about this operation in the branch (${this.work_branch_name})`, "metadata saved");
                let updateinfo = {
                    unit_type: unit_type,
                    unit_name: unit_name,
                    orig_branch: this.orig_branch_name,
                    work_branch: this.work_branch_name,
                    tmp_branch: this.tmp_branch_name,
                    generator_version: generator_version
                };
                this.gitLogic.set_branch_description(this.work_branch_name, JSON.stringify(updateinfo));
                this.explain("before rebasing", ["ls", "-lR", this.unitdir.abspath]);
                this.explain("before rebasing", ["cat", this.unitdir.abspath + "/dist/hithere.js"]);
                // rebase the target branch onto the temporary one (this operation will fail if there are merge conflicts)
                this.info(3, `rebasing the new (${this.work_branch_name}) onto the temp one (${this.tmp_branch_name})`, "branch rebased");
                try {
                    this.gitLogic.rebase_branch_from_point_onto(this.work_branch_name, tag_after_old_version, this.tmp_branch_name);
                    this.explain("after rebasing", ["ls", "-lR", this.unitdir.abspath]);
                    this.explain("after rebasing", ["cat", this.unitdir.abspath + "/dist/hithere.js"]);
                }
                catch (e) {
                    this.info(3, `checking why the operation failed`, "reason identified", "branch operation did not complete");
                    if (this.gitLogic.state == git_logic_1.GitState.OpInProgress) {
                        console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
                        console.log(chalk_1.default.bold.blue("Merge conflicts detected.  Please resolve the conflicts and run 'proj-maker continue'"));
                        console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
                        return;
                    }
                    else {
                        throw "Unknown failure reason";
                    }
                }
                // finalize he operation
                this.finalize_update();
            }
            finally {
                this.undo_stash();
            }
        });
    }
    undo_stash() {
        if (this.did_stash) {
            if (this.changed_branch) {
                console.log(chalk_1.default.bold.blue(`Note: did not undo 'stash' because stash performed in the branch ${this.orig_branch_name}`));
            }
            else {
                this.did_stash = false;
                this.info(3, `undoing the previous stash`, "stash pop complete");
                this.gitLogic.stash_pop();
            }
        }
    }
}
exports.ProjMaker = ProjMaker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qLW1ha2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQ0FBcUM7QUFDckMsMkNBQW9DO0FBQ3BDLHFDQUE0QjtBQUM1QixpREFBMEM7QUFFMUMsaUNBQXlCO0FBQ3pCLGlEQUEwQztBQUMxQywyQ0FBaUQ7QUFFakQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFBO0FBRTNCLG9CQUE0QixTQUFRLEtBQUs7SUFDckMsWUFBbUIsR0FBVztRQUFHLEtBQUssQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQWpELFFBQUcsR0FBSCxHQUFHLENBQVE7SUFBc0MsQ0FBQztDQUV4RTtBQUhELHdDQUdDO0FBRUQsV0FBaUIsY0FBYztJQUMzQix1QkFBK0IsU0FBUSxjQUFjO1FBQUcsZ0JBQWdCLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQXpILGdDQUFpQixvQkFBd0csQ0FBQTtJQUN0SSx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTdILGdDQUFpQixvQkFBNEcsQ0FBQTtJQUMxSSx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLDhCQUE4QixHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTNILGdDQUFpQixvQkFBMEcsQ0FBQTtJQUN4SSxxQkFBNkIsU0FBUSxjQUFjO1FBQUcsWUFBWSxPQUFjLElBQUksS0FBSyxDQUFDLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQXJILDhCQUFlLGtCQUFzRyxDQUFBO0lBQ2xJLGtCQUEwQixTQUFRLGNBQWM7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