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
})(ProjMakerError = exports.ProjMakerError || (exports.ProjMakerError = {}));
class ProjMaker {
    constructor() {
        this._verbose = true;
        this.explain = this._explain;
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
    prepareEnvironment(unit_type, unit_name, create_unitdir, generator_version = null) {
        this.unit_name = unit_name;
        if (this.unitdir.abspath == null)
            throw new ProjMakerError.CantFindUnit(`${unit_name}`);
        if (!create_unitdir && !this.unitdir.isDir)
            throw new ProjMakerError.CantFindUnit(`${unit_name}`);
        if (!this.templatedir.isDir)
            throw new ProjMakerError.TemplateDirNotSet;
        // verify that there is a generator for this unit type
        if (!(this.getDirForGenerator(unit_type, generator_version).isDir)) {
            throw new ProjMakerError.NoGenerator(unit_type);
        }
        let parent = this.unitdir.parent;
        if (parent.abspath == null) {
            throw "Unexpected state: outdir does not have parent";
        }
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
        if (create_unitdir) {
            // verify that the tag doesn't already exist
            if (git.get_tags_matching(this.get_tagname(unit_name)).length > 0) {
                throw new ProjMakerError.TagExists(this.tagname);
            }
            // if the directory exists: make sure it's empty before proceeding
            if (this.unitdir.isDir) {
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
                this.unitdir.mkdirs();
            }
        }
        else {
            if (!this.unitdir.isDir) {
                throw new ProjMakerError.CantFindUnit(this.unitdir.abspath);
            }
        }
        // ensure at least one commit in the repo (we can't stash before that)
        if (git.commit_count == 0) {
            git.empty_commit("[proj-maker autocommit] initial commit");
        }
        // do a 'git stash' before running the generator
        this.explain("before stashing", ["ls", "-l", parent.abspath]);
        this.explain("before stashing", ["git", "status"]);
        this.did_stash = git.stash_with_untracked_excluding(this.unitdir.abspath);
        this.explain(`did_stash: ${this.did_stash}`);
        this.explain("after stashing", ["ls", "-l", parent.abspath]);
    }
    get pminfo_path() {
        return this.unitdir.add(".pminfo.json");
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
                yield this.runHygen([unit_type, this.getCmdForGenerator(generator_version), '--name', unit_name], this.templatedir, this.unitdir);
                // save proj-maker info about the unit
                this.pminfo_path.saveStrSync(JSON.stringify({ unit_type: unit_type }));
                // add and commit the changes
                this.gitLogic.add(this.unitdir.abspath);
                this.gitLogic.commit(`[proj-maker autocommit] added unit '${unit_name}' of type '${unit_type}'`);
            }
            finally {
                // undo the stash
                if (this.did_stash) {
                    this.gitLogic.stash_pop();
                }
            }
            // tag the commit with "pmAFTER_ADDING_<unit-name>"
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
            let pminfo = this.pminfo_path.contentsFromJSON;
            if (!pminfo) {
                throw new ProjMakerError.NotProjMakerUnit(this.unitdir.abspath, "can't find .pminfo.json");
            }
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
                let matching_tags = this.gitLogic.get_tags_matching(this.get_tagname(unit_name));
                if (matching_tags.length == 0 || matching_tags[0] != this.get_tagname(unit_name)) {
                    throw new ProjMakerError.MissingCreationTag(this.get_tagname(unit_name));
                }
                // remember the current branch
                orig_branch_name = this.gitLogic.current_branch;
                let tag_after_old_version = `${this.get_tagname(unit_name)}`;
                let tag_before_old_version = `${this.get_tagname(unit_name)}~1`;
                let tmp_branch_name = `tmp-pm-updating-${unit_name}`;
                let target_branch_name = `pm-updating-${unit_name}`;
                // create a temporary branch from right before the tag
                this.gitLogic.create_branch(tmp_branch_name, tag_before_old_version);
                // defensive programming:  verify that the unit directory has disappeared
                if (this.unitdir.isDir && this.unitdir.dirContents && this.unitdir.dirContents.length > 0) {
                    console.log(chalk_1.default.bgRedBright("WARNING: git current branch is now " + tmp_branch_name));
                    throw new ProjMakerError.UnexpectedState(`${this.unitdir.abspath} not empty after creating branch from tag: ${tag_before_old_version}`);
                }
                // run the latest version of the generator
                yield this.runHygen([unit_type, 'new', '--name', unit_name], this.templatedir, this.unitdir);
                // add and commit the newly created unit
                this.gitLogic.add(this.unitdir.abspath);
                this.gitLogic.commit(`[proj-maker autocommit] recreated unit '${unit_name}' of type '${unit_type}' (NEW VERSION of '${unit_type}')`);
                // create the target branch (branching off the orig_branch HEAD)
                this.gitLogic.create_branch(target_branch_name, orig_branch_name);
                // rebase the target branch onto the temporary one
                this.gitLogic.rebase_branch_from_point_onto(target_branch_name, tag_after_old_version, tmp_branch_name);
            }
            finally {
                // undo the stash
                if (this.did_stash) {
                    this.gitLogic.stash_pop();
                }
            }
        });
    }
}
exports.ProjMaker = ProjMaker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qLW1ha2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQ0FBcUM7QUFDckMsMkNBQW9DO0FBQ3BDLHFDQUE0QjtBQUM1QixpREFBMEM7QUFFMUMsaUNBQXlCO0FBQ3pCLGlEQUEwQztBQUMxQywyQ0FBdUM7QUFFdkMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFBO0FBRTNCLG9CQUE0QixTQUFRLEtBQUs7SUFDckMsWUFBbUIsR0FBVztRQUFHLEtBQUssQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQWpELFFBQUcsR0FBSCxHQUFHLENBQVE7SUFBc0MsQ0FBQztDQUV4RTtBQUhELHdDQUdDO0FBRUQsV0FBaUIsY0FBYztJQUMzQix1QkFBK0IsU0FBUSxjQUFjO1FBQUcsZ0JBQWdCLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQXpILGdDQUFpQixvQkFBd0csQ0FBQTtJQUN0SSx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTdILGdDQUFpQixvQkFBNEcsQ0FBQTtJQUMxSSx1QkFBK0IsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLDhCQUE4QixHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQTNILGdDQUFpQixvQkFBMEcsQ0FBQTtJQUN4SSxrQkFBMEIsU0FBUSxjQUFjO1FBQUcsWUFBWSxNQUFhLElBQUksS0FBSyxDQUFDLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQWhILDJCQUFZLGVBQW9HLENBQUE7SUFDN0gsaUJBQXlCLFNBQVEsY0FBYztR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