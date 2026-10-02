//#region src/index.d.ts
/**
 * @name match-sorter
 * @license MIT license.
 * @copyright (c) 2099 Kent C. Dodds
 * @author Kent C. Dodds <me@kentcdodds.com> (https://kentcdodds.com)
 */
type AccessorAttributes = {
  threshold?: Ranking;
  maxRanking: Ranking;
  minRanking: Ranking;
};
interface RankingInfo {
  rankedValue: any;
  rank: Ranking;
  accessorIndex: number;
  accessorThreshold: Ranking | undefined;
  passed: boolean;
}
interface AccessorOptions<TItem> {
  accessor: AccessorFn<TItem>;
  threshold?: Ranking;
  maxRanking?: Ranking;
  minRanking?: Ranking;
}
type AccessorFn<TItem> = (item: TItem) => string | Array<string>;
type Accessor<TItem> = AccessorFn<TItem> | AccessorOptions<TItem>;
interface RankItemOptions<TItem = unknown> {
  accessors?: ReadonlyArray<Accessor<TItem>>;
  threshold?: Ranking;
  keepDiacritics?: boolean;
}
declare const rankings: {
  readonly CASE_SENSITIVE_EQUAL: 7;
  readonly EQUAL: 6;
  readonly STARTS_WITH: 5;
  readonly WORD_STARTS_WITH: 4;
  readonly CONTAINS: 3;
  readonly ACRONYM: 2;
  readonly MATCHES: 1;
  readonly NO_MATCH: 0;
};
type Ranking = (typeof rankings)[keyof typeof rankings];
/**
 * Gets the highest ranking value for the given item based on its values for the given keys
 * @param {*} item - the item to rank
 * @param {String} value - the value to rank against
 * @param {Object} options - options to control the ranking
 * @return {{rank: Number, accessorIndex: Number, accessorThreshold: Number}} - the highest ranking
 */
declare function rankItem<TItem>(item: TItem, value: string, options?: RankItemOptions<TItem>): RankingInfo;
/**
 * Sorts items that have a rank, index, and accessorIndex
 * @param {Object} a - the first item to sort
 * @param {Object} b - the second item to sort
 * @return {Number} -1 if a should come first, 1 if b should come first, 0 if equal
 */
declare function compareItems<_TItem>(a: RankingInfo, b: RankingInfo): number;
//#endregion
export { Accessor, AccessorAttributes, AccessorFn, AccessorOptions, RankItemOptions, Ranking, RankingInfo, compareItems, rankItem, rankings };