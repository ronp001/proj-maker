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
    class StashFailed extends ProjMakerError {
        constructor() { super(`The 'git stash' operation did not leave a clean environment`); }
    }
    ProjMakerError.StashFailed = StashFailed;
})(ProjMakerError = exports.ProjMakerError || (exports.ProjMakerError = {}));
class ProjMaker {
    constructor() {
        this.in_extra_commit_mode = false;
        this._verbose = true;
        this.explain = this._explain;
        this._post_msg = null;
        this.did_stash = false;
        this.unitdir = new path_helper_1.AbsPath(null);
        this.unit_name = null;
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
        if (!this.verbose)
            return;
        console.log(chalk_1.default.red(str));
        let cmd = cmd_and_params.shift();
        if (cmd) {
            console.log(chalk_1.default.magentaBright("running: " + cmd + " " + cmd_and_params.join(" ")));
            let result = child_process_1.execFileSync(cmd, cmd_and_params);
            console.log(chalk_1.default.magenta(result));
        }
    }
    info(level, msg, post_msg) {
        if (this._post_msg) {
            msg = this._post_msg + ". " + msg;
        }
        this._post_msg = post_msg;
        console.log(chalk_1.default.green(`INFO: ${msg}`));
    }
    prepareEnvironment(unit_type, unit_name, create_unitdir, generator_version = null) {
        this.unit_name = unit_name;
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
        this.info(3, `verifying that not in a pm-* branch`, "not in a pm-* branch");
        let current_branch = git.current_branch_or_null || "";
        if (current_branch.startsWith("pm-")) {
            throw new ProjMakerError.InPmBranch(current_branch);
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
            git.empty_commit("[proj-maker autocommit] initial commit");
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
                    this.gitLogic.empty_commit(`[proj-maker autocommit] empty commit after adding ${unit_name}`);
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
        this.info(3, `restoring branch ${switch_to}`, "branch restored");
        this.gitLogic.checkout(switch_to);
        this.info(3, `deleting temporary branch(es): ${delete_branches.join(",")}`, "branches deleted");
        for (let branch of delete_branches) {
            this.gitLogic.delete_branch(branch);
        }
    }
    update_unit(unit_name) {
        return __awaiter(this, void 0, void 0, function* () {
            //--------------------------------------------
            // figure out the unit name and type
            //--------------------------------------------
            if (!unit_name) {
                unit_name = new path_helper_1.AbsPath(process.cwd()).basename;
            }
            this.unit_name = unit_name;
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
            //--------------------------------------------
            // make sure the git environment is clean
            //--------------------------------------------
            this.prepareEnvironment(unit_type, unit_name, false);
            let orig_branch_name = null;
            try {
                // verify that the tag we're looking for exists
                this.info(3, `ensure the tag ${this.tagname} is in the repo`, "tag found");
                let matching_tags = this.gitLogic.get_tags_matching(this.get_tagname(unit_name));
                if (matching_tags.length == 0 || matching_tags[0] != this.get_tagname(unit_name)) {
                    throw new ProjMakerError.MissingCreationTag(this.get_tagname(unit_name));
                }
                // remember the current branch
                this.info(3, `making note of the current branch`, "branch noted");
                orig_branch_name = this.gitLogic.current_branch;
                let tag_after_old_version = `${this.get_tagname(unit_name)}`;
                let parent_count = this.in_extra_commit_mode ? 2 : 1;
                let tag_before_old_version = `${this.get_tagname(unit_name)}~${parent_count}`;
                let tmp_branch_name = `pm-before-updating-${unit_name}`;
                let target_branch_name = `pm-updating-${unit_name}`;
                // create a temporary branch from right before the tag
                this.info(3, `creating temporary branch: ${tmp_branch_name}`, "branch created");
                this.gitLogic.create_branch(tmp_branch_name, tag_after_old_version);
                // defensive programming:  verify that the unit directory exists
                this.info(3, `making sure unit dir ${this.unitdir.abspath} still exists after branch creation`, "dir exists");
                if (!this.unitdir.isDir) {
                    console.log(chalk_1.default.bgRedBright("WARNING: git current branch is now " + tmp_branch_name));
                    throw new ProjMakerError.UnexpectedState(`${this.unitdir.abspath} does not exist after creating branch from tag: ${tag_after_old_version}`);
                }
                // remove the unitdir contents
                this.info(3, `removing previous contents of ${this.unitdir.abspath}`, "contents removed");
                this.unitdir.rmrfdir(new RegExp(`${unit_name}`));
                // run the latest version of the generator
                this.info(3, `running the generator`, "generator execution complete");
                yield this.runHygen([unit_type, 'new', '--name', unit_name], this.templatedir, this.unitdir);
                // save proj-maker info about the unit
                this.info(3, `recreating .pminfo.json`, "created");
                this.create_pminfo(unit_type);
                // quit if nothing changed
                this.info(3, `checking if anything has changed`, null);
                if (this.gitLogic.state == git_logic_1.GitState.Clean) {
                    console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
                    console.log(chalk_1.default.bold.blue("New generator did not change anything. Completing the operation"));
                    console.log(chalk_1.default.bold.blue("---------------------------------------------------------------"));
                    this.cleanup_branches(orig_branch_name, [tmp_branch_name]);
                    this.info(3, "restored branches", null);
                    return;
                }
                // add and commit the newly created unit
                this.info(3, `changes detected. adding and committing new contents`, "committed");
                this.gitLogic.add(this.unitdir.abspath);
                this.gitLogic.commit(`[proj-maker autocommit] recreated unit '${unit_name}' of type '${unit_type}' (NEW VERSION of '${unit_type}')`);
                // create the target branch (branching off the orig_branch HEAD)
                this.info(3, `creating another branch (${target_branch_name})`, "branch created");
                this.gitLogic.create_branch(target_branch_name, orig_branch_name);
                // rebase the target branch onto the temporary one
                this.info(3, `rebasing the new (${target_branch_name}) onto the temp one (${tmp_branch_name})`, "branch rebased");
                this.gitLogic.rebase_branch_from_point_onto(target_branch_name, tag_after_old_version, tmp_branch_name);
            }
            finally {
                // undo the stash
                if (this.did_stash) {
                    this.info(3, `undoing the previous stash`, "stash pop complete");
                    this.gitLogic.stash_pop();
                }
            }
        });
    }
}
exports.ProjMaker = ProjMaker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qLW1ha2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQ0FBcUM7QUFDckMsMkNBQW9DO0FBQ3BDLHFDQUE0QjtBQUM1QixpREFBMEM7QUFFMUMsaUNBQXlCO0FBQ3pCLGlEQUEwQztBQUMxQywyQ0FBaUQ7QUFFakQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFBO0FBRTNCLG9CQUE0QixTQUFRLEtBQUs7SUFDckMsWUFBbUIsR0FBVztRQUFHLEtBQUssQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQWpELFFBQUcsR0FBSCxHQUFHLENBQVE7SUFBc0MsQ0FBQztDQUV4RTtBQUhELHdDQUdDO0FBRUQsV0FBaUIsY0FBYztJQUMzQix1QkFBK0IsU0FBUSxjQUFjO1FBQUcsZ0JBQWdCLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQXpILGdDQUFpQixvQkFBd0csQ0FBQTtJQUN0SSx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTdILGdDQUFpQixvQkFBNEcsQ0FBQTtJQUMxSSx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLDhCQUE4QixHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTNILGdDQUFpQixvQkFBMEcsQ0FBQTtJQUN4SSxrQkFBMEIsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQWhILDJCQUFZLGVBQW9HLENBQUE7SUFDN0gsaUJBQXlCLFNBQVEsY0FBYztR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