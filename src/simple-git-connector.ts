import * as simplegit from "../node_modules/simple-git/promise/index"

export interface mySimpleGit extends simplegit.SimpleGit {
    init(): Promise<void>
    stash(options?: simplegit.Options): Promise<void>;
    commit(message:string): Promise<void>;

}

export class SimpleGitConnector {
    public static connect(path?:string) : mySimpleGit {
        const simpleGit : mySimpleGit = require('simple-git')(path)
        return simpleGit
    }
}