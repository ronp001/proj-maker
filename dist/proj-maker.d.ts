import { AbsPath } from './path_helper';
import { GitLogic } from './git_logic';
export declare class ProjMakerError extends Error {
    msg: string;
    constructor(msg: string);
}
export declare namespace ProjMakerError {
    class BasedirNotSet extends ProjMakerError {
        constructor();
    }
    class OutputDirNotFound extends ProjMakerError {
        constructor(outdir: string);
    }
    class OutputDirNotEmpty extends ProjMakerError {
        constructor(outdir: string);
    }
    class NoGenerator extends ProjMakerError {
        constructor(unit_type: string);
    }
    class NotInGitRepo extends ProjMakerError {
        constructor();
    }
}
export declare class ProjMaker {
    static overrideMockables(instance: ProjMaker): void;
    constructor();
    runHygen: ((hygen_args: string[], template_path: AbsPath, output_path: AbsPath) => void);
    gitConnector: GitLogic;
    readonly templatedir: AbsPath;
    readonly basedir: AbsPath | null;
    getDirForGenerator(unit_type: string): AbsPath;
    getDirForNewUnit(unit_name: string): AbsPath;
    explain(str: string, cmd_and_params?: string[]): void;
    new_unit(unit_type: string, unit_name: string): Promise<void>;
}
