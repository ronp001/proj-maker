export class StrUtils {
    public static canonize(str:string) : string {
        return str.replace(/_/g,'').replace(/-/g, '').replace(/\s/g,'').toLowerCase()
    }
    public static isSimilar(str1:string, str2:string) : boolean {
        return StrUtils.canonize(str1) == StrUtils.canonize(str2)
    }
}