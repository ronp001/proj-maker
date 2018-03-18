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
    class BasedirNotSet extends ProjMakerError {
        constructor() { super("Base dir not set ($HYGEN_TMPLS)"); }
    }
    ProjMakerError.BasedirNotSet = BasedirNotSet;
    class OutputDirNotFound extends ProjMakerError {
        constructor(outdir) { super("Cannot find output directory: " + outdir); }
    }
    ProjMakerError.OutputDirNotFound = OutputDirNotFound;
    class OutputDirNotEmpty extends ProjMakerError {
        constructor(outdir) { super("Output directory not empty: " + outdir); }
    }
    ProjMakerError.OutputDirNotEmpty = OutputDirNotEmpty;
    class NoGenerator extends ProjMakerError {
        constructor(unit_type) { super("Cannot find generator for unit type: " + unit_type); }
    }
    ProjMakerError.NoGenerator = NoGenerator;
    class NotInGitRepo extends ProjMakerError {
        constructor() { super("Must be in git repo"); }
    }
    ProjMakerError.NotInGitRepo = NotInGitRepo;
})(ProjMakerError = exports.ProjMakerError || (exports.ProjMakerError = {}));
class ProjMaker {
    // The following allows running ProjMaker in a test environment
    // without worrying about having to mock the potentially dangerous functions
    // in every instance of ProjMaker.
    // To use this: override initProjMaker with a function that creates the appropriate mocks.
    static overrideMockables(instance) {
        // by default, this does nothing
    }
    constructor() {
        this.runHygen = hygen_runner_1.HygenRunner.runHygen;
        this.gitConnector = new git_logic_1.GitLogic();
        ProjMaker.overrideMockables(this);
    }
    get templatedir() {
        if (this.basedir)
            return this.basedir;
        return new path_helper_1.AbsPath("./_templates");
    }
    get basedir() {
        if (process.env.HYGEN_TMPLS) {
            return new path_helper_1.AbsPath(process.env.HYGEN_TMPLS);
        }
        return null;
    }
    getDirForGenerator(unit_type) {
        return new path_helper_1.AbsPath(this.basedir).add(unit_type).add('new');
    }
    getDirForNewUnit(unit_name) {
        let current = new path_helper_1.AbsPath('.');
        let basename = current.basename;
        if (str_utils_1.StrUtils.isSimilar(unit_name, basename)) {
            return current;
        }
        return current.add(unit_name);
    }
    explain(str, cmd_and_params = []) {
        console.log(chalk_1.default.red(str));
        let cmd = cmd_and_params.shift();
        if (cmd) {
            console.log(chalk_1.default.magentaBright("running: " + cmd + " " + cmd_and_params.join(" ")));
            let result = child_process_1.execFileSync(cmd, cmd_and_params);
            console.log(chalk_1.default.magenta(result));
        }
    }
    new_unit(unit_type, unit_name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.basedir)
                throw new ProjMakerError.BasedirNotSet;
            logger_1.LOG(`type: ${unit_type}  name: ${unit_name}`);
            // verify that there is a generator for this unit type
            if (!(this.getDirForGenerator(unit_type).isDir)) {
                throw new ProjMakerError.NoGenerator(unit_type);
            }
            // decide whether to create the project in the current directory, or
            // to create a subdirectory with a matching name
            let outdir = this.getDirForNewUnit(unit_name);
            if (outdir.abspath == null)
                throw "Unexpected state: outdir.abspath is null";
            let parent = outdir.parent;
            if (parent.abspath == null) {
                throw "Unexpected state: outdir does not have parent";
            }
            // find the containing git repo
            let gitroot = parent.findUpwards(".git", true).parent;
            if (!gitroot.isDir) {
                throw new ProjMakerError.NotInGitRepo();
            }
            // verify that the directory is indeed a git repository        
            let git = this.gitConnector;
            git.project_dir = gitroot;
            if (!git.is_repo) {
                throw new ProjMakerError.NotInGitRepo();
            }
            // if the directory exists: make sure it's empty before proceeding
            if (outdir.isDir) {
                // verify that the directory is empty
                let dircontents = outdir.dirContents;
                if (dircontents == null) {
                    throw new ProjMakerError.OutputDirNotFound(outdir.toString());
                }
                if (dircontents.length > 0) {
                    if (dircontents.length != 1 || dircontents[0].basename != ".git") {
                        throw new ProjMakerError.OutputDirNotEmpty(outdir.toString());
                    }
                }
            }
            else {
                outdir.mkdirs();
            }
            // ensure at least one commit in the repo
            if (git.commit_count == 0) {
                git.empty_commit("[proj-maker autocommit] initial commit");
            }
            // do a 'git stash' before running the generator
            this.explain("before stashing", ["ls", "-l", parent.abspath]);
            this.explain("before stashing", ["git", "status"]);
            let did_stash = git.stash_with_untracked_excluding(outdir.abspath);
            this.explain(`did_stash: ${did_stash}`);
            this.explain("after stashing", ["ls", "-l", parent.abspath]);
            try {
                // run the generator
                yield this.runHygen([unit_type, 'new', '--name', unit_name], this.templatedir, outdir);
                // add and commit the changes
                git.add(outdir.abspath);
                git.commit(`[proj-maker autocommit] added unit '${unit_name}' of type '${unit_type}'`);
            }
            finally {
                // undo the stash
                if (did_stash) {
                    git.stash_pop();
                }
            }
            // tag the commit with "pmAFTER_ADDING_<unit-name>"
            let tagname = `pmAFTER_ADDING_${unit_name}`;
            git.create_tag(tagname);
        });
    }
}
exports.ProjMaker = ProjMaker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm9qLW1ha2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQ0FBcUM7QUFDckMsMkNBQW9DO0FBQ3BDLHFDQUE0QjtBQUM1QixpREFBMEM7QUFFMUMsaUNBQXlCO0FBQ3pCLGlEQUEwQztBQUMxQywyQ0FBdUM7QUFFdkMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFBO0FBRTNCLG9CQUE0QixTQUFRLEtBQUs7SUFDckMsWUFBbUIsR0FBVztRQUFHLEtBQUssQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQWpELFFBQUcsR0FBSCxHQUFHLENBQVE7SUFBc0MsQ0FBQztDQUV4RTtBQUhELHdDQUdDO0FBRUQsV0FBaUIsY0FBYztJQUMzQixtQkFBMkIsU0FBUSxjQUFjO1FBQUcsZ0JBQWdCLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQXBHLDRCQUFhLGdCQUF1RixDQUFBO0lBQ2pILHVCQUErQixTQUFRLGNBQWM7UUFBRyxZQUFZLE1BQWEsSUFBSSxLQUFLLENBQUMsZ0NBQWdDLEdBQUcsTUFBTSxDQUFDLENBQUEsQ0FBRSxDQUFDO0tBQUU7SUFBN0gsZ0NBQWlCLG9CQUE0RyxDQUFBO0lBQzFJLHVCQUErQixTQUFRLGNBQWM7UUFBRyxZQUFZLE1BQWEsSUFBSSxLQUFLLENBQUMsOEJBQThCLEdBQUcsTUFBTSxDQUFDLENBQUEsQ0FBRSxDQUFDO0tBQUU7SUFBM0gsZ0NBQWlCLG9CQUEwRyxDQUFBO0lBQ3hJLGlCQUF5QixTQUFRLGNBQWM7UUFBRyxZQUFZLFNBQWdCLElBQUksS0FBSyxDQUFDLHVDQUF1QyxHQUFHLFNBQVMsQ0FBQyxDQUFBLENBQUUsQ0FBQztLQUFFO0lBQXBJLDBCQUFXLGNBQXlILENBQUE7SUFDakosa0JBQTBCLFNBQVEsY0FBYztR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