import { AbsPath } from './path_helper';
import { GitLogic } from './git_logic';
export declare class ProjMakerError extends Error {
    msg: string;
    constructor(msg: string);
}
export declare namespace ProjMakerError {
    class TemplateDirNotSet extends ProjMakerError {
        constructor();
    }
    class OutputDirNotFound extends ProjMakerError {
        constructor(outdir: string);
    }
    class OutputDirNotEmpty extends ProjMakerError {
        constructor(outdir: string);
    }
    class CantFindUnit extends ProjMakerError {
        constructor(outdir: string);
    }
    class NoGenerator extends ProjMakerError {
        constructor(unit_type: string);
    }
    class NotInGitRepo extends ProjMakerError {
        constructor();
    }
    class UnexpectedState extends ProjMakerError {
        constructor(msg: string);
    }
    class NotProjMakerUnit extends ProjMakerError {
        constructor(unit_path: string, reason: string);
    }
    class MissingCreationTag extends ProjMakerError {
        constructor(tag: string);
    }
    class TagExists extends ProjMakerError {
        constructor(tag: string);
    }
    class InPmBranch extends ProjMakerError {
        constructor(branch: string);
    }
    class StashFailed extends ProjMakerError {
        constructor();
    }
}
export declare class ProjMaker {
    in_extra_commit_mode: boolean;
    static overrideMockables(instance: ProjMaker): void;
    private _verbose;
    verbose: boolean;
    constructor();
    runHygen: ((hygen_args: string[], template_path: AbsPath, output_path: AbsPath) => void);
    gitLogic: GitLogic;
    explain: (str: string, cmd_and_params?: string[]) => void;
    readonly templatedir: AbsPath;
    getCmdForGenerator(generator_version?: number | null): string;
    getDirForGenerator(unit_type: string, generator_version?: number | null): AbsPath;
    getDirForUnit(unit_name: string): AbsPath;
    _explain(str: string, cmd_and_params?: string[]): void;
    private _post_msg;
    private info(level, msg, post_msg);
    private did_stash;
    private unitdir;
    private prepareEnvironment(unit_type, unit_name, create_unitdir, generator_version?);
    readonly pminfo_path: AbsPath;
    create_pminfo(unit_type: string): void;
    new_unit(unit_type: string, unit_name: string, generator_version?: number | null): Promise<void>;
    private unit_name;
    readonly tagname: string;
    get_tagname(unit_name?: string): string;
    cleanup_branches(switch_to: string, delete_branches: string[]): void;
    update_unit(unit_name?: string): Promise<void>;
}
