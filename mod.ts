const progNameExp = /(?<program_name>[a-z-_]+)/;
const argExp = /(?<arg><[A-Z]+>(?:\...)?)/g;
const flagExp = /(?<flag>-[a-z], --[a-z\-]+[a-z]|--[a-z\-]+[a-z]|-[a-z])/;

const optExp =
  /(?<option>-[a-z], --[a-z\-]+[a-z]=<[A-Z\-]+>(?:\...)?|--[a-z\-]+[a-z]\=<[A-Z\-]+>(?:\...)?|-[a-z]\=<[A-Z\-]+>(?:\...)?)/;

const usageExp = new RegExp(
  `${optExp.source}|${flagExp.source}|${argExp.source}`,
  "g",
);

type Usage = {
  readonly string: string;
  readonly args: ReadonlyArray<Arg>;
  readonly flags: ReadonlyArray<Flag>;
  readonly options: ReadonlyArray<Option>;
};

type Match<T> = T & Record<string, unknown>;

type Arg = {
  readonly name: string;
  readonly normalizedName: string;
  readonly multiple: boolean;
  readonly regexp: RegExp;
};

type Flag = {
  readonly name: string;
  readonly normalizedName: string;
  readonly alias?: string;
  readonly regexp: RegExp;
};

type Option = Flag & {
  readonly arg: Arg;
};

export function cmdr<T = Record<string, unknown>>(usageStr: string) {
  const usage = parseUsage(usageStr);

  return (input: ReadonlyArray<string>): { usage: Usage; match: Match<T> } => ({
    usage,
    match: parseInput<T>(input, usage),
  });
}

function parseInput<T>(input: ReadonlyArray<string>, usage: Usage): Match<T> {
  // console.log("usage", usage);

  const initResult = {
    ...usage.flags.reduce(
      (r, flag) => ({ ...r, [flag.normalizedName]: false }),
      {},
    ),
    ...usage.options.reduce(
      (r, opt) => ({ ...r, [opt.normalizedName]: undefined }),
      {},
    ),
    ...usage.args.reduce(
      (r, arg) => ({
        ...r,
        [arg.normalizedName]: arg.multiple ? [] : undefined,
      }),
      {},
    ),
  };

  const [result, _] = input.reduce<
    [Record<string, string | boolean | string[]>, ReadonlyArray<string>]
  >(
    ([r, skippedArgs], i) => {
      if (skippedArgs.includes(i)) {
        return [r, skippedArgs];
      }

      const matchOpt = usage.options.find((opt) => i.match(opt.regexp));

      if (matchOpt) {
        const matchArg = i.match(matchOpt.arg.regexp) || [];

        if (matchArg.length === 1) {
          const argValue = input[input.indexOf(i) + 1];

          return [{ ...r, [matchOpt.normalizedName]: argValue }, [
            ...skippedArgs,
            argValue,
          ]];
        }

        return [{ ...r, [matchOpt.normalizedName]: matchArg[1] }, [
          ...skippedArgs,
          matchArg[1],
        ]];
      }

      const matchFlag = usage.flags.find((flag) => i.match(flag.regexp));

      if (matchFlag) {
        return [{ ...r, [matchFlag.normalizedName]: true }, skippedArgs];
      }

      const matchArg = usage.args.find((arg) => i.match(arg.regexp));

      if (matchArg) {
        if (matchArg.multiple) {
          return [{
            ...r,
            [matchArg.normalizedName]: [
              ...(r[matchArg.normalizedName] as unknown as string[] || []),
              i,
            ],
          }, skippedArgs];
        }

        return [{ ...r, [matchArg.normalizedName]: i }, skippedArgs];
      }

      return [r, skippedArgs];
    },
    [initResult, []],
  );

  return result as Match<T>;
}

function parseUsage(usageStr: string): Usage {
  const name = usageStr.match(progNameExp)?.slice(0, 1).toString() ||
    "dummy-name-replace-me";
  const matches = matchAll(usageExp, usageStr.replace(name, ""));

  return {
    string: usageStr,
    args: matches.arg.map(parseArg),
    flags: matches.flag.map(parseFlag),
    options: matches.option.map(parseOption),
  };
}

function parseArg(argStr: string): Arg {
  const name = argStr.match(/(?<=<)[A-Z-]+/)?.join("");

  if (!name) {
    throw new Error(`Could not get argument name from "${argStr}"`);
  }

  return {
    name,
    normalizedName: normalizeKey(name),
    multiple: argStr.endsWith("..."),
    regexp: new RegExp(
      `(?<arg${name.replace("-", "")}>(")?[aA-zZ\\d\\s\\-\\?\\@]+(")?)`,
      "g",
    ),
  };
}

function parseFlag(flagStr: string): Flag {
  const alias = flagStr.match(/(?!-)[a-z]/)?.join("");
  const name = flagStr.match(/(?<=--)[a-z\-]+[a-z]/)?.join("") || alias;

  if (!name) {
    throw new Error(`Could not get flag name from "${flagStr}"`);
  }

  const flagMatcher = alias ? `(-${alias}|--${name})` : `(--${name})`;

  const regexp = new RegExp(
    `(?<flag${name.replace("-", "")}>${flagMatcher})`,
    "g",
  );

  return { name, alias, regexp, normalizedName: normalizeKey(name) };
}

function parseOption(optStr: string): Option {
  const alias = optStr.match(/(?!-)[a-z]/)?.join("");
  const name = optStr.match(/(?<=--)[a-z\-]+[a-z]/)?.join("") || alias;

  if (!name) {
    throw new Error(`Could not get option name from "${optStr}"`);
  }

  const option = { name, alias, arg: parseArg(optStr) };

  const flagMatcher = alias ? `(-${alias}|--${name})` : `(--${name})`;
  // const argMatcher = `[=\\s]${option.arg.regexp.source}`;

  const regexp = new RegExp(
    `(?<option${name.replace("-", "")}>${flagMatcher})`,
    option.arg.multiple ? "g" : "",
  );

  return { ...option, regexp, normalizedName: normalizeKey(name) };
}

function matchAll(
  regexp: RegExp,
  data: string,
  result: Record<string, ReadonlyArray<string>> = {},
): Record<string, ReadonlyArray<string>> {
  const match = regexp.exec(data);
  const groups = match ? match.groups ? match.groups : {} : {};

  const initResult = Object.keys(result).length > 0
    ? result
    : Object.keys(groups).reduce((r, k) => ({ ...r, [k]: [] }), {});

  const newResult = Object.keys(initResult).reduce(
    (r, k) => ({
      ...r,
      [k]: groups[k] ? [...initResult[k], groups[k]] : initResult[k],
    }),
    initResult,
  );

  return match ? matchAll(regexp, data, newResult) : newResult;
}

function normalizeKey(key: string) {
  const normalizedKey = key.split(/[-_]/).map((part) => part.toLowerCase()).map(
    (part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1, part.length)}`,
  ).join("");

  return `${normalizedKey.slice(0, 1).toLowerCase()}${
    normalizedKey.slice(1, normalizedKey.length)
  }`;
}
