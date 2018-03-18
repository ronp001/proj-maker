import { CliApp } from "./cli-app";
export default class ProjMakerCli extends CliApp {
    private proj_maker;
    protected beforeCommand(): void;
    protected afterCommand(): void;
    protected _init(): void;
    private new_unit(unit_type, name, options);
    private update(unit_name?);
    private status();
    private list_unit_types();
}
