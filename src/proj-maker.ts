import {AbsPath} from './path_helper'
import * as _ from "lodash"

const APP_VERSION = "0.2.0"

export class ProjMakerError extends Error {
    constructor(public msg: string) {super(msg)}
    public get message() { return "proj-maker - " + this.msg }
}

export namespace ProjMakerError {
    export class ExampleError extends ProjMakerError { constructor() { super("example error")  } }
}


export class ProjMaker {
    public go() : string {
        return "demo result"
    }
}