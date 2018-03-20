"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_helper_1 = require("./path_helper");
const _ = require("lodash");
const chalk_1 = require("chalk");
var GitLogicError;
(function (GitLogicError) {
    class NotConnectedToProject extends Error {
    }
    GitLogicError.NotConnectedToProject = NotConnectedToProject;
    class InvalidPath extends Error {
    }
    GitLogicError.InvalidPath = InvalidPath;
    class AddFailed extends Error {
    }
    GitLogicError.AddFailed = AddFailed;
})(GitLogicError = exports.GitLogicError || (exports.GitLogicError = {}));
var GitState;
(function (GitState) {
    GitState["Undefined"] = "Undefined";
    GitState["NonRepo"] = "Non Repo";
    GitState["NoCommits"] = "No Commits";
    GitState["Dirty"] = "Dirty";
    GitState["Clean"] = "Clean";
    GitState["OpInProgress"] = "OpInProgress"; // a rebase or merge operation is in progress
})(GitState = exports.GitState || (exports.GitState = {}));
class GitLogic {
    constructor(path) {
        this._path = new path_helper_1.AbsPath(null);
        this.runcmd = this._runcmd; // allow mocking
        if (path != null) {
            this._path = path;
        }
    }
    auto_connect() {
        let gitroot = new path_helper_1.AbsPath(process.cwd()).findUpwards(".git", true).parent;
        if (!gitroot.isDir) {
            throw "not in git repo";
        }
        this.project_dir = gitroot;
    }
    get project_dir() { return this._path; }
    set project_dir(path) {
        this._path = path;
    }
    _runcmd(gitcmd, args = []) {
        let old_dir = null;
        if (this._path.abspath == null) {
            throw new GitLogicError.NotConnectedToProject("GitLogic: command executed before setting project_dir");
        }
        if (!this._path.isDir) {
            throw new GitLogicError.InvalidPath("GitLogic: project_dir is not an existing directory");
        }
        try {
            let dirinfo = "";
            try {
                if (process.cwd() != this._path.abspath) {
                    old_dir = process.cwd();
                    process.chdir(this._path.abspath);
                    dirinfo = chalk_1.default.blue(`(in ${process.cwd()}) `);
                }
                else {
                    dirinfo = chalk_1.default.black(`(in ${process.cwd()}) `);
                }
            }
            catch (e) {
                process.chdir(this._path.abspath);
            }
            console.log(dirinfo + chalk_1.default.blue("git " + [gitcmd].concat(args).join(" ")));
            let result = child_process_1.execFileSync('git', [gitcmd].concat(args));
            console.log(chalk_1.default.cyan(result.toString()));
            return result;
        }
        catch (e) {
            console.error(chalk_1.default.cyan(`git command failed: ${e}`));
            throw e;
        }
        finally {
            if (old_dir != null) {
                process.chdir(old_dir);
            }
        }
    }
    get state() {
        if (!this._path.isSet)
            return GitState.Undefined;
        if (!this.is_repo)
            return GitState.NonRepo;
        if (!this.has_head)
            return GitState.NoCommits;
        try {
            this.merge("HEAD");
        }
        catch (e) {
            return GitState.OpInProgress;
        }
        if (this.parsed_status.length > 0)
            return GitState.Dirty;
        return GitState.Clean;
    }
    get has_head() {
        return (this.current_branch_or_null != null);
    }
    get is_repo() {
        try {
            this.status();
        }
        catch (e) {
            return false;
        }
        return true;
    }
    status() {
        this.runcmd("status");
    }
    get parsed_status() {
        return this.to_lines(this.runcmd('status', ['--porcelain']));
    }
    get stash_list() {
        return this.to_lines(this.runcmd('stash', ['list']));
    }
    get stash_count() {
        return this.stash_list.length;
    }
    stash_with_untracked_excluding(dir_to_exclude) {
        let stashcount = this.stash_count;
        let output = this.runcmd("stash", ["push", "--include-untracked", "-m", "proj-maker-auto-stash", "--", `:(exclude)${dir_to_exclude}`]);
        // let output = this.runcmd("stash", ["push", "--include-untracked", "-m", "proj-maker-auto-stash", "--", ":(exclude)new_unit"])
        return (this.stash_count > stashcount);
    }
    // public stash_with_untracked() : boolean {
    //     let objname = this.runcmd("stash", ["create", "--include-untracked"])
    //     if ( objname == "") {
    //         return false
    //     }
    //     this.runcmd("stash", ["store", "-m", "proj-maker auto-stash", objname])
    //     return true
    // }
    stash_pop() {
        this.runcmd("stash", ["pop"]);
    }
    init() {
        this.runcmd("init");
    }
    get current_branch_or_null() {
        try {
            return this.runcmd("rev-parse", ["--abbrev-ref", "HEAD"]).toString().trim();
        }
        catch (e) {
            return null;
        }
    }
    get current_branch() {
        return this.current_branch_or_null || "";
    }
    show_branching_graph() {
        this.runcmd("log", ["--graph", "--pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset%n'", "--abbrev-commit", "--date=relative", "--branches"]);
    }
    create_branch(branch_name, branching_point) {
        let result = this.runcmd("checkout", ["-b", branch_name, branching_point]).toString().trim();
        // this.runcmd("lgb")
        this.show_branching_graph();
        return result;
    }
    delete_branch(branch_name) {
        return this.runcmd("branch", ["-D", branch_name]).toString().trim();
    }
    checkout(branch_name) {
        this.runcmd("checkout", [branch_name]);
        this.show_branching_graph();
    }
    checkout_dir_from_branch(dir, branch_name) {
        this.runcmd("checkout", [branch_name, "--", dir]);
    }
    set_branch_description(branch, description) {
        this.runcmd('config', [`branch.${branch}.description`, description]);
    }
    get_branch_description(branch) {
        return this.to_lines(this.runcmd('config', [`branch.${branch}.description`]));
    }
    merge(branch_name) {
        this.runcmd("merge", [branch_name]);
        if (branch_name != "HEAD")
            this.show_branching_graph();
    }
    rebase_branch_from_point_onto(branch, from_point, onto) {
        let result = this.runcmd("rebase", ["--onto", onto, from_point, branch]);
        this.show_branching_graph();
        return result;
    }
    get commit_count() {
        try {
            return parseInt(this.runcmd("rev-list", ["--count", "HEAD"]).toString());
        }
        catch (e) {
            return 0;
        }
    }
    get_tags_matching(pattern) {
        return this.to_lines(this.runcmd("tag", ["-l", pattern]));
    }
    to_lines(buf) {
        let result;
        if (buf instanceof Buffer) {
            result = buf.toString().split("\n");
        }
        else if (buf instanceof Array) {
            result = buf;
        }
        else {
            result = buf.split("\n");
        }
        return _.filter(result, (s) => { return s.length > 0; });
    }
    get_files_in_commit(commit) {
        return this.to_lines(this.runcmd("diff-tree", ["--no-commit-id", "--name-only", "-r", commit]));
    }
    create_tag(tagname) {
        this.runcmd("tag", [tagname]);
    }
    add(path) {
        let paths;
        if (path instanceof Array) {
            paths = path;
        }
        else {
            paths = [path];
        }
        try {
            this.runcmd("add", paths);
        }
        catch (e) {
            throw new GitLogicError.AddFailed(e.message);
        }
    }
    commit(comment) {
        this.runcmd("commit", ["-m", comment]);
    }
    commit_allowing_empty(comment) {
        this.runcmd("commit", ["--allow-empty", "-m", comment]);
    }
}
exports.GitLogic = GitLogic;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0X2xvZ2ljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2dpdF9sb2dpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlEQUEwQztBQUMxQywrQ0FBcUM7QUFFckMsNEJBQTJCO0FBQzNCLGlDQUF5QjtBQUV6QixJQUFpQixhQUFhLENBSTdCO0FBSkQsV0FBaUIsYUFBYTtJQUMxQiwyQkFBbUMsU0FBUSxLQUFLO0tBQUc7SUFBdEMsbUNBQXFCLHdCQUFpQixDQUFBO0lBQ25ELGlCQUF5QixTQUFRLEtBQUs7S0FBRztJQUE1Qix5QkFBVyxjQUFpQixDQUFBO0lBQ3pDLGVBQXVCLFNBQVEsS0FBSztLQUFHO0lBQTFCLHVCQUFTLFlBQWlCLENBQUE7QUFDM0MsQ0FBQyxFQUpnQixhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQUk3QjtBQUVELElBQVksUUFNUztBQU5yQixXQUFZLFFBQVE7SUFBSSxtQ0FBcUIsQ0FBQTtJQUNyQixnQ0FBa0IsQ0FBQTtJQUNsQixvQ0FBc0IsQ0FBQTtJQUN0QiwyQkFBYSxDQUFBO0lBQ2IsMkJBQWEsQ0FBQTtJQUNiLHlDQUEyQixDQUFBLENBQUMsNkNBQTZDO0FBQzdFLENBQUMsRUFOVCxRQUFRLEdBQVIsZ0JBQVEsS0FBUixnQkFBUSxRQU1DO0FBRXJCO0lBQ0ksWUFBbUIsSUFBZTtRQWMxQixVQUFLLEdBQWEsSUFBSSxxQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBT3BDLFdBQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBLENBQUMsZ0JBQWdCO1FBcEJ6QyxFQUFFLENBQUMsQ0FBRSxJQUFJLElBQUksSUFBSyxDQUFDLENBQUMsQ0FBQztZQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNyQixDQUFDO0lBQ0wsQ0FBQztJQUVNLFlBQVk7UUFDZixJQUFJLE9BQU8sR0FBRyxJQUFJLHFCQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMs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