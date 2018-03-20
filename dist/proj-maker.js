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
            git.commit_allowing_empty("[proj-maker autocommit (prepare_env)] initial commit");
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
                this.gitLogic.commit(`[proj-maker autocommit (new_unit)] added unit '${unit_name}' of type '${unit_type}'`);
                if (this.in_extra_commit_mode) {
                    // create an extra commit to serve as the start point for the rebase chain
                    this.info(3, "creating extra commit to avoid branching at the generation point", "extra commit created");
                    this.gitLogic.commit_allowing_empty(`[proj-maker autocommit (new_unit, extra-commit)] empty commit after adding ${unit_name}`);
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
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.finalize_update();
        });
    }
    get generator_version_string() {
        if (this.generator_version) {
            return `${this.unit_type} v.${this.generator_version}`;
        }
        else {
            return `${this.unit_type} (latest)`;
        }
    }
    finalize_update() {
        return __awaiter(this, void 0, void 0, function* () {
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
            // run the generator again, and create a new 'base commit'
            this.info(3, `running the new generator in branch ${orig_branch} to create a new base commit`, "generator execution complete");
            yield this.runHygen([this.unit_type || "", this.getCmdForGenerator(this.generator_version), '--name', this.unit_name], this.templatedir, this.unitdir);
            // save proj-maker info about the unit
            this.info(3, `recreating .pminfo.json`, "created");
            this.create_pminfo(this.unit_type || "");
            this.info(3, `committing generator output`, "committed");
            this.gitLogic.add(this.unit_name);
            this.gitLogic.commit(`[proj-maker autocommit (finalize_update)] output of ${this.generator_version_string}`);
            // clean the directory one more time
            this.info(3, `removing generator output before getting user modifications`, "generator output removed");
            this.unitdir.rmrfdir(new RegExp(`${this.unit_name}`), true);
            if (this.unitdir.isDir)
                throw new ProjMakerError.UnexpectedState(`${this.unitdir.toString()} not deleted`);
            // get the contents from the working branch
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
                // console.log(chalk.bold.blue("---------------------------------------------------------------"))
                console.log(chalk_1.default.bold.blue(`Applied ${this.generator_version_string}.  No user changes.`));
            }
            this.info(3, `committing changes to ${orig_branch}`, "committed");
            this.gitLogic.commit_allowing_empty(`[proj-maker autocommit (finalize_update)] applied user changes after running ${this.generator_version_string}`);
            this.info(3, `updating the tag ${this.tagname}`, "updated");
            this.gitLogic.move_tag(this.tagname, "HEAD~1");
            this.undo_stash();
            this.info(3, "", null);
        });
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
                this.info(3, `checking if ${this.unitdir.abspath} still exists after branch creation`, "dir does not exist (this is probably the first update)");
                if (this.unitdir.isDir) {
                    this.info(3, `removing previous contents of ${this.unitdir.abspath}`, "contents removed", "dir exists (likely updated before)");
                    this.unitdir.rmrfdir(new RegExp(`${unit_name}`));
                }
                // run the requested version of the generator
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
                this.gitLogic.commit(`[proj-maker autocommit (update_unit in tmp_branch)] recreated unit '${unit_name}' using '${unit_type}' ${version_str}`);
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
                // this.explain("before rebasing", ["cat", this.unitdir.abspath + "/dist/hithere.js"])
                // rebase the target branch onto the temporary one (this operation will fail if there are merge conflicts)
                this.info(3, `rebasing the new (${this.work_branch_name}) onto the temp one (${this.tmp_branch_name})`, "branch rebased");
                try {
                    this.gitLogic.rebase_branch_from_point_onto(this.work_branch_name, tag_after_old_version, this.tmp_branch_name);
                    this.explain("after rebasing", ["ls", "-lR", this.unitdir.abspath]);
                    // this.explain("after rebasing", ["cat", this.unitdir.abspath + "/dist/hithere.js"])
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qLW1ha2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQ0FBcUM7QUFDckMsMkNBQW9DO0FBQ3BDLHFDQUE0QjtBQUM1QixpREFBMEM7QUFFMUMsaUNBQXlCO0FBQ3pCLGlEQUEwQztBQUMxQywyQ0FBaUQ7QUFFakQsb0JBQTRCLFNBQVEsS0FBSztJQUNyQyxZQUFtQixHQUFXO1FBQUcsS0FBSyxDQUFDLGVBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFBakQsUUFBRyxHQUFILEdBQUcsQ0FBUTtJQUFzQyxDQUFDO0NBRXhFO0FBSEQsd0NBR0M7QUFFRCxXQUFpQixjQUFjO0lBQzNCLHVCQUErQixTQUFRLGNBQWM7UUFBRyxnQkFBZ0IsS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUEsQ0FBRSxDQUFDO0tBQUU7SUFBekgsZ0NBQWlCLG9CQUF3RyxDQUFBO0lBQ3RJLHVCQUErQixTQUFRLGNBQWM7UUFBRyxZQUFZLE1BQWEsSUFBSSxLQUFLLENBQUMsZ0NBQWdDLEdBQUcsTUFBTSxDQUFDLENBQUEsQ0FBRSxDQUFDO0tBQUU7SUFBN0gsZ0NBQWlCLG9CQUE0RyxDQUFBO0lBQzFJLHVCQUErQixTQUFRLGNBQWM7UUFBRyxZQUFZLE1BQWEsSUFBSSxLQUFLLENBQUMsOEJBQThCLEdBQUcsTUFBTSxDQUFDLENBQUEsQ0FBRSxDQUFDO0tBQUU7SUFBM0gsZ0NBQWlCLG9CQUEwRyxDQUFBO0lBQ3hJLHFCQUE2QixTQUFRLGNBQWM7UUFBRyxZQUFZLE9BQWMsSUFBSSxLQUFLLENBQUMsd0JBQXdCLEdBQUcsT0FBTyxDQUFDLENBQUEsQ0FBRSxDQUFDO0tBQUU7SUFBckgsOEJBQWUsa0JBQXNHLENBQUE7SUFDbEksa0JBQTBCLFNBQVEsY0FBYztRQUFHLFlBQVksTUFBYSxJQUFJLEtBQUssQ0FBQyx3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