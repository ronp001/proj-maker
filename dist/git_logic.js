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
class GitLogic {
    constructor(path) {
        this._path = new path_helper_1.AbsPath(null);
        this.runcmd = this._runcmd; // allow mocking
        if (path != null) {
            this._path = path;
        }
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
    get current_branch() {
        return this.runcmd("rev-parse", ["--abbrev-ref", "HEAD"]).toString().trim();
    }
    create_branch(branch_name, branching_point) {
        return this.runcmd("checkout", ["-b", branch_name, branching_point]).toString().trim();
    }
    rebase_branch_from_point_onto(branch, from_point, onto) {
        return this.runcmd("rebase", ["--onto", onto, from_point, branch]);
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
    empty_commit(comment) {
        this.runcmd("commit", ["--allow-empty", "-m", comment]);
    }
}
exports.GitLogic = GitLogic;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0X2xvZ2ljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2dpdF9sb2dpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlEQUEwQztBQUMxQywrQ0FBcUM7QUFFckMsNEJBQTJCO0FBQzNCLGlDQUF5QjtBQUV6QixJQUFpQixhQUFhLENBSTdCO0FBSkQsV0FBaUIsYUFBYTtJQUMxQiwyQkFBbUMsU0FBUSxLQUFLO0tBQUc7SUFBdEMsbUNBQXFCLHdCQUFpQixDQUFBO0lBQ25ELGlCQUF5QixTQUFRLEtBQUs7S0FBRztJQUE1Qix5QkFBVyxjQUFpQixDQUFBO0lBQ3pDLGVBQXVCLFNBQVEsS0FBSztLQUFHO0lBQTFCLHVCQUFTLFlBQWlCLENBQUE7QUFDM0MsQ0FBQyxFQUpnQixhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQUk3QjtBQUVEO0lBQ0ksWUFBbUIsSUFBZTtRQU0xQixVQUFLLEdBQWEsSUFBSSxxQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBT3BDLFdBQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBLENBQUMsZ0JBQWdCO1FBWnpDLEVBQUUsQ0FBQyxDQUFFLElBQUksSUFBSSxJQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ3JCLENBQUM7SUFDTCxDQUFDO0lBSUQsSUFBVyxXQUFXLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUEsQ0FBQyxDQUFDO0lBQzlDLElBQVcsV0FBVyxDQUFDLElBQWM7UUFDakMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7SUFDckIsQ0FBQztJQUlPLE9BQU8sQ0FBQyxNQUFhLEVBQUUsT0FBYyxFQUFFO1FBQzNDLElBQUksT0FBTyxHQUFtQixJQUFJLENBQUE7UUFDbEMsRUFBRSxDQUFDLENBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksSUFBSyxDQUFDLENBQUMsQ0FBQztZ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