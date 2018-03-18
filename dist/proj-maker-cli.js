"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const chalk_1 = require("chalk");
const cli_app_1 = require("./cli-app");
const proj_maker_1 = require("./proj-maker");
class ProjMakerCli extends cli_app_1.CliApp {
    constructor() {
        super(...arguments);
        this.proj_maker = new proj_maker_1.ProjMaker();
    }
    beforeCommand() {
        // executed before command starts      
        if (program.verbose) {
            this.proj_maker.verbose = true;
        }
    }
    afterCommand() {
        // executed after command completes
    }
    _init() {
        program
            .description('proj-maker - not described yet')
            .version('0.1.0')
            .option('-v, --verbose', "provide more info");
        //-------------------------
        // Commands
        //-------------------------
        program.command('new <unit-type> <name>')
            .description("create a new unit of type <unit-type> with the name <name>")
            .option('-n, --generator-version <n>', 'use an older version of the generator for <unit-type>', parseInt)
            .action(this.action(this.new_unit));
        program.command('update [unit-name]')
            .description("updates the current unit to the latest version of the generator")
            .action(this.action(this.update));
        program.command('status')
            .alias('s')
            .description("show info")
            .action(this.action(this.status));
        program.command('list')
            .alias('l')
            .description("list available unit types")
            .action(this.action(this.list_unit_types));
    }
    new_unit(unit_type, name, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.proj_maker.new_unit(unit_type, name, options.generatorVersion ? options.generatorVersion : null);
            }
            catch (e) {
                console.error(e.message);
            }
        });
    }
    update(unit_name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.proj_maker.update_unit(unit_name);
            }
            catch (e) {
                console.error(e.message);
            }
        });
    }
    status() {
        console.log("");
        console.log("ProjMaker");
        console.log("---------");
        console.log("Templates directory ($HYGEN_TMPLS):", this.proj_maker.templatedir.isDir ? this.proj_maker.templatedir.toString() : chalk_1.default.red("NOT SET"));
        console.log("");
    }
    list_unit_types() {
        console.log("Available unit types:");
        let dirs = this.proj_maker.templatedir.foreachEntryInDir((entry, direction) => {
            if (direction == "down" && entry.isDir && entry.add("new").isDir) {
                console.log(chalk_1.default.bold(` ${entry.basename}`));
            }
        });
    }
}
exports.default = ProjMakerCli;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci1jbGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcHJvai1tYWtlci1jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHFDQUFvQztBQUVwQyxpQ0FBeUI7QUFDekIsdUNBQWdDO0FBRWhDLDZDQUFxRDtBQUVyRCxrQkFBa0MsU0FBUSxnQkFBTTtJQUFoRDs7UUFFWSxlQUFVLEdBQWUsSUFBSSxzQkFBUyxFQUFFLENBQUM7SUE0RXJELENBQUM7SUExRWEsYUFBYTtRQUNuQix1Q0FBdUM7UUFDdkMsRUFBRSxDQUFDLENBQUUsT0FBTyxDQUFDLE9BQVEsQ0FBQyxDQUFDLENBQUM7WUFDcEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ2xDLENBQUM7SUFDTCxDQUFDO0lBRVMsWUFBWTtRQUNsQixtQ0FBbUM7SUFDdkMsQ0FBQztJQUVTLEtBQUs7UUFFWCxPQUFPO2FBQ04sV0FBVyxDQUFDLGdDQUFnQyxDQUFDO2FBQzdDLE9BQU8sQ0FBQyxPQUFPLENBQUM7YUFDaEIsTUFBTSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBRTdDLDJCQUEyQjtRQUMzQixXQUFXO1FBQ1gsMkJBQTJCO1FBQzNCLE9BQU8sQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUM7YUFDeEMsV0FBVyxDQUFDLDREQUE0RCxDQUFDO2FBQ3pFLE1BQU0sQ0FBQyw2QkFBNkIsRUFBRSx1REFBdUQsRUFBRSxRQUFRLENBQUM7YUFDeEcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFcEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQzthQUNwQyxXQUFXLENBQUMsaUVBQWlFLENBQUM7YUFDOUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7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