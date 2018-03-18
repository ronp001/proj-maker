import {execFileSync} from "child_process"
import {AbsPath} from "./path_helper"
import { isArray } from "util";

export namespace GitConnectorError {
    export class NotConnectedToProject extends Error {}
    export class InvalidPath extends Error {}
    export class AddFailed extends Error {}
}

export class GitConnectorSync {
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

    private _runcmd(gitcmd:string, args:string[]=[]) : string {
        let old_dir : string | null = null
        if ( this._path.abspath == null ) {
            throw new GitConnectorError.NotConnectedToProject("GitConnectorSync: command executed before setting project_dir")
        }
        if ( !this._path.isDir ) {
            throw new GitConnectorError.InvalidPath("GitConnectorSync: project_dir is not an existing directory")            
        }
        try {
            try {
                if ( process.cwd() != this._path.abspath ) {
                    old_dir = process.cwd()
                    process.chdir(this._path.abspath)
                    console.log("GitConnectorSync: changed dir to", process.cwd())
                }                    
            } catch(e) { // process.cwd() throws an error if the current directory does not exist
                process.chdir(this._path.abspath)                
            }
            console.log("GitConnectorSync running:  git",[gitcmd].concat(args).join(" "))
            let result = execFileSync('git',[gitcmd].concat(args))
            console.log("GitConnectorSync output:", result.toString())
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

    public stash_with_untracked() : boolean {
        let objname = this.runcmd("stash", ["create", "--include-untracked", "proj-maker auto-stash"])
        if ( objname == "") {
            return false
        }
        this.runcmd("stash", ["store", objname])
        return true
    }

    public stash_pop() {
        this.runcmd("stash", ["pop"])
    }
    public init() {
        this.runcmd("init")
    }

    public get commit_count() : number {
        return parseInt(this.runcmd("rev-list",["--count", "HEAD"]))
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
            throw new GitConnectorError.AddFailed(e.message)
        }
    }

    public commit(comment:string) {
        this.runcmd("commit", ["-m",comment])
    }
}