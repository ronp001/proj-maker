import { CliApp } from "./cli-app";
export default class ProjMakerCli extends CliApp {
    private proj_maker;
    protected beforeCommand(): void;
    protected afterCommand(): void;
    protected _init(): void;
    private continue_update();
    private new_unit(unit_type, name, options);
    private update(unit_name_or_options?, options?);
    private status();
    private list_unit_types();
}
