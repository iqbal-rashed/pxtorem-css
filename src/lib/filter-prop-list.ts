/**
 * Filter functions for property list matching
 */

function filterExact(list: string[]): string[] {
  return list.filter((m) => m.match(/^[^*!]+$/));
}

function filterContain(list: string[]): string[] {
  return list.filter((m) => m.match(/^\*.+\*$/)).map((m) => m.slice(1, -1));
}

function filterStartWith(list: string[]): string[] {
  return list.filter((m) => m.match(/^[^*!]+\*$/)).map((m) => m.slice(0, -1));
}

function filterEndWith(list: string[]): string[] {
  return list.filter((m) => m.match(/^\*[^*]+$/)).map((m) => m.slice(1));
}

function filterNotExact(list: string[]): string[] {
  return list.filter((m) => m.match(/^![^*].*$/)).map((m) => m.slice(1));
}

function filterNotContain(list: string[]): string[] {
  return list.filter((m) => m.match(/^!\*.+\*$/)).map((m) => m.slice(2, -1));
}

function filterNotStartWith(list: string[]): string[] {
  return list.filter((m) => m.match(/^!\*[^*]+$/)).map((m) => m.slice(2));
}

function filterNotEndWith(list: string[]): string[] {
  return list.filter((m) => m.match(/^![^*]+\*$/)).map((m) => m.slice(1, -1));
}

export const filterPropList = {
  exact: filterExact,
  contain: filterContain,
  startWith: filterStartWith,
  endWith: filterEndWith,
  notExact: filterNotExact,
  notContain: filterNotContain,
  notStartWith: filterNotStartWith,
  notEndWith: filterNotEndWith,
};

export interface PropListMatches {
  exact: string[];
  contain: string[];
  startWith: string[];
  endWith: string[];
  notExact: string[];
  notContain: string[];
  notStartWith: string[];
  notEndWith: string[];
}

/**
 * Creates a matcher function for checking if a property matches the propList
 */
export function createPropListMatcher(
  propList: string[]
): (prop: string) => boolean {
  const hasWild = propList.indexOf('*') > -1;
  const matchAll = hasWild && propList.length === 1;

  const lists: PropListMatches = {
    exact: filterPropList.exact(propList),
    contain: filterPropList.contain(propList),
    startWith: filterPropList.startWith(propList),
    endWith: filterPropList.endWith(propList),
    notExact: filterPropList.notExact(propList),
    notContain: filterPropList.notContain(propList),
    notStartWith: filterPropList.notStartWith(propList),
    notEndWith: filterPropList.notEndWith(propList),
  };

  return (prop: string): boolean => {
    if (matchAll) return true;

    return (
      (hasWild ||
        lists.exact.indexOf(prop) > -1 ||
        lists.contain.some((m) => prop.indexOf(m) > -1) ||
        lists.startWith.some((m) => prop.indexOf(m) === 0) ||
        lists.endWith.some(
          (m) => prop.indexOf(m) === prop.length - m.length
        )) &&
      !(
        lists.notExact.indexOf(prop) > -1 ||
        lists.notContain.some((m) => prop.indexOf(m) > -1) ||
        lists.notStartWith.some((m) => prop.indexOf(m) === 0) ||
        lists.notEndWith.some((m) => prop.indexOf(m) === prop.length - m.length)
      )
    );
  };
}
