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
            .action(this.action(this.new_unit));
        program.command('status')
            .alias('s')
            .description("show info")
            .action(this.action(this.status));
    }
    new_unit(unit_type, name, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.proj_maker.new_unit(unit_type, name);
            console.log("ProjMaker:", result);
        });
    }
    status() {
        console.log("");
        console.log("ProjMaker");
        console.log("---------");
        console.log("Base directory ($HYGEN_TMPLS):", this.proj_maker.basedir ? this.proj_maker.basedir.toString() : chalk_1.default.red("NOT SET"));
        console.log("");
    }
}
exports.default = ProjMakerCli;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvai1tYWtlci1jbGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcHJvai1tYWtlci1jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLHFDQUFvQztBQUVwQyxpQ0FBeUI7QUFDekIsdUNBQWdDO0FBRWhDLDZDQUFxRDtBQUVyRCxrQkFBa0MsU0FBUSxnQkFBTTtJQUFoRDs7UUFFWSxlQUFVLEdBQWUsSUFBSSxzQkFBUyxFQUFFLENBQUM7SUEyQ3JELENBQUM7SUF6Q2EsYUFBYTtRQUNuQix5Q0FBeUM7SUFDN0MsQ0FBQztJQUVTLFlBQVk7UUFDbEIsbUNBQW1DO0lBQ3ZDLENBQUM7SUFFUyxLQUFLO1FBRVgsT0FBTzthQUNOLFdBQVcsQ0FBQyxnQ0FBZ0MsQ0FBQzthQUM3QyxPQUFPLENBQUMsT0FBTyxDQUFDO2FBQ2hCLE1BQU0sQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUU3QywyQkFBMkI7UUFDM0IsV0FBVztRQUNYLDJCQUEyQjtRQUMzQixPQUFPLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDO2FBQ3hDLFdBQVcsQ0FBQyw0REFBNEQsQ0FBQzthQUN6RSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUVwQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUN4QixLQUFLLENBQUMsR0FBRyxDQUFDO2FBQ1YsV0FBVyxDQUFDLFdBQVcsQ0FBQzthQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBR2EsUUFBUSxDQUFDLFNBQWlCLEVBQUUsSUFBWSxFQUFFLE9BQVc7O1lBQy9ELElBQUksTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzVELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3JDLENBQUM7S0FBQTtJQUVPLE1BQU07UUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDbEksT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNuQixDQUFDO0NBQ0o7QUE3Q0QsK0JBNkNDIn0=