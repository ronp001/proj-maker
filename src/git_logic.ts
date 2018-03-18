import {execFileSync} from "child_process"
import {AbsPath} from "./path_helper"
import { isArray } from "util";
import * as _ from "lodash"
import chalk from "chalk"

export namespace GitLogicError {
    export class NotConnectedToProject extends Error {}
    export class InvalidPath extends Error {}
    export class AddFailed extends Error {}
}

export class GitLogic {
    public constructor(path? : AbsPath) {
        if ( path != null ) {
            this._path = path
        }
    }

    private _path : AbsPath = new AbsPath(null)

    public get project_dir() { return this._path }
    public set project_dir(path : AbsPath) {
        this._path = path
    }

    public runcmd = this._runcmd // allow mocking

    private _runcmd(gitcmd:string, args:string[]=[]) : Buffer | string | string[] {
        let old_dir : string | null = null
        if ( this._path.abspath == null ) {
            throw new GitLogicError.NotConnectedToProject("GitConnectorSync: command executed before setting project_dir")
        }
        if ( !this._path.isDir ) {
            throw new GitLogicError.InvalidPath("GitConnectorSync: project_dir is not an existing directory")            
        }
        try {
            let dirinfo = ""
            try {
                if ( process.cwd() != this._path.abspath ) {
                    old_dir = process.cwd()
                    process.chdir(this._path.abspath)
                    dirinfo = chalk.black(`(in ${process.cwd()}) `)
                }                    
            } catch(e) { // process.cwd() throws an error if the current directory does not exist
                process.chdir(this._path.abspath)                
            }
            console.log(dirinfo + chalk.blue("git " + [gitcmd].concat(args).join(" ")))
            let result = execFileSync('git',[gitcmd].concat(args))
            console.log(chalk.cyan(result.toString()))
            return result
        } finally {
            if ( old_dir != null ) {
                process.chdir(old_dir)
            }
        }
    }

    public get is_repo() : boolean {
        try {
            this.status()
        } catch(e) {
            return false
        }
        return true
    }

    public status() {
        this.runcmd("status")
    }

    public get stash_list() : string[] {
        return this.to_lines(this.runcmd('stash',['list']))
    }

    public get stash_count() : number {
        return this.stash_list.length
    }

    public stash_with_untracked_excluding(dir_to_exclude:string) : boolean {
        let stashcount = this.stash_count
        let output = this.runcmd("stash", ["push", "--include-untracked", "-m", "proj-maker-auto-stash", "--", `:(exclude)${dir_to_exclude}`])
        // let output = this.runcmd("stash", ["push", "--include-untracked", "-m", "proj-maker-auto-stash", "--", ":(exclude)new_unit"])
        return (this.stash_count > stashcount)
    }
    // public stash_with_untracked() : boolean {
    //     let objname = this.runcmd("stash", ["create", "--include-untracked"])
    //     if ( objname == "") {
    //         return false
    //     }
    //     this.runcmd("stash", ["store", "-m", "proj-maker auto-stash", objname])
    //     return true
    // }

    public stash_pop() {
        this.runcmd("stash", ["pop"])
    }
    public init() {
        this.runcmd("init")
    }

    public get commit_count() : number {
        try {
            return parseInt(this.runcmd("rev-list",["--count", "HEAD"]).toString())
        } catch ( e ) {
            return 0
        }
    }

    public get_tags_matching(pattern:string) : string[] {
        return this.to_lines(this.runcmd("tag", ["-l", pattern]))
    }

    public to_lines(buf:Buffer|string[]|string) : string[] {
        if ( buf instanceof Buffer ) {
            let result = buf.toString().split("\n")
            return _.filter(result,(s:string) => {return s.length > 0})
        } else if ( buf instanceof Array ) {
            return buf
        } else {
            return buf.split("\n")
        }
    }

    public get_files_in_commit(commit:string) : string[] {
        return this.to_lines(this.runcmd("diff-tree", ["--no-commit-id", "--name-only", "-r", commit]))
    }

    public create_tag(tagname:string) {
        this.runcmd("tag", [tagname])
    }

    public add(path:string|string[]) {
        let paths : string[]
        if ( path instanceof Array ) {
            paths = path as string[]
        } else {
            paths = [path as string]
        }

        try {
            this.runcmd("add", paths)
        } catch(e) {
            throw new GitLogicError.AddFailed(e.message)
        }
    }

    public commit(comment:string) {
        this.runcmd("commit", ["-m",comment])
    }
    public empty_commit(comment:string) {
        this.runcmd("commit", ["--allow-empty","-m",comment])
    }
}