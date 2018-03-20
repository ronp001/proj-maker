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
export declare enum GitState {
    Undefined = "Undefined",
    NonRepo = "Non Repo",
    NoCommits = "No Commits",
    Dirty = "Dirty",
    Clean = "Clean",
    OpInProgress = "OpInProgress",
}
export declare class GitLogic {
    constructor(path?: AbsPath);
    auto_connect(): void;
    private _path;
    project_dir: AbsPath;
    runcmd: (gitcmd: string, args?: string[]) => string | string[] | Buffer;
    private _runcmd(gitcmd, args?);
    readonly state: GitState;
    readonly has_head: boolean;
    readonly is_repo: boolean;
    status(): void;
    readonly parsed_status: string[];
    readonly stash_list: string[];
    readonly stash_count: number;
    stash_with_untracked_excluding(dir_to_exclude: string): boolean;
    stash_pop(): void;
    init(): void;
    readonly current_branch_or_null: string | null;
    readonly current_branch: string;
    show_branching_graph(): void;
    create_branch(branch_name: string, branching_point: string): string;
    delete_branch(branch_name: string): string;
    checkout(branch_name: string): void;
    checkout_dir_from_branch(dir: string, branch_name: string): void;
    set_branch_description(branch: string, description: string): void;
    get_branch_description(branch: string): string[];
    merge(branch_name: string): void;
    rebase_branch_from_point_onto(branch: string, from_point: string, onto: string): string | string[] | Buffer;
    readonly commit_count: number;
    get_tags_matching(pattern: string): string[];
    to_lines(buf: Buffer | string[] | string): string[];
    get_files_in_commit(commit: string): string[];
    create_tag(tagname: string): void;
    add(path: string | string[]): void;
    commit(comment: string): void;
    commit_allowing_empty(comment: string): void;
}
