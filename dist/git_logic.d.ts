/// <reference types="node" />
import { AbsPath } from "./path_helper";
export declare namespace GitLogicError {
    class NotConnectedToProject extends Error {
    }
    class InvalidPath extends Error {
    }
    class AddFailed extends Error {
    }
}
export declare class GitLogic {
    constructor(path?: AbsPath);
    private _path;
    project_dir: AbsPath;
    runcmd: (gitcmd: string, args?: string[]) => string | string[] | Buffer;
    private _runcmd(gitcmd, args?);
    readonly is_repo: boolean;
    status(): void;
    readonly stash_list: string[];
    readonly stash_count: number;
    stash_with_untracked_excluding(dir_to_exclude: string): boolean;
    stash_pop(): void;
    init(): void;
    readonly commit_count: number;
    get_tags_matching(pattern: string): string[];
    to_lines(buf: Buffer | string[] | string): string[];
    get_files_in_commit(commit: string): string[];
    create_tag(tagname: string): void;
    add(path: string | string[]): void;
    commit(comment: string): void;
    empty_commit(comment: string): void;
}
