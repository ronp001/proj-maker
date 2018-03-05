import { AbsPath } from './path_helper';
export declare class HygenRunner {
    static runHygen(hygen_args: string[], template_path: AbsPath, output_path: AbsPath): Promise<void>;
}
