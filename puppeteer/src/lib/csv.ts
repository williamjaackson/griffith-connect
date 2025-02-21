function csvToJson(text: string, headers?: string[], quoteChar: string = '"', delimiter: string = ',') {
    // Create regex for matching CSV fields
    const regex = new RegExp(
        `\\s*(${quoteChar})?(.*?)\\1\\s*(?:${delimiter}|$)`,
        'gs'
    );
  
    const match = (line: string): string[] => 
        [...line.matchAll(regex)]
            .map(m => m[2])  // we only want the second capture group
            .slice(0, -1);   // cut off blank match at the end
  
    const lines = text.split('\n');
    const heads = headers ?? match(lines.shift() || '');
  
    return lines
        .filter(line => line.trim().length > 0)  // Skip empty lines
        .map(line => {
            return match(line).reduce((acc, cur, i) => {
                // Attempt to parse as a number; replace blank matches with `null`
                const val = cur.length <= 0 ? null : Number(cur) || cur;
                const key = heads[i] ?? `extra_${i}`;
                return { ...acc, [key]: val };
            }, {});
        });
}
  
export default csvToJson;