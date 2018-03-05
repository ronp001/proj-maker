import { AbsPath } from './path_helper';
import { HygenRunner } from './hygen_runner';
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
}
export declare class ProjMaker {
    runHygen: typeof HygenRunner.runHygen;
    readonly templatedir: AbsPath;
    readonly basedir: AbsPath | null;
    getDirForGenerator(unit_type: string): AbsPath;
    getDirForNewUnit(unit_name: string): AbsPath;
    new_unit(unit_type: string, unit_name: string): Promise<void>;
}
