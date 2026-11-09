/*!
 * TypeScript declarations for lunr-lts
 * Describes the public lunr API documented in lib/.
 * lunr Copyright (C) 2020 Oliver Nightingale
 * @license MIT
 */

/**
 * A convenience function for configuring and constructing a new lunr Index.
 *
 * The config function is called with a lunr.Builder as both its context and
 * its argument, after the default pipelines have been set up.
 */
declare function lunr (config: lunr.ConfigFunction): lunr.Index

declare namespace lunr {
  type ConfigFunction = (this: Builder, builder: Builder) => void

  const version: string

  /**
   * A function that can be added to a lunr.Pipeline. Returning null, undefined
   * or an empty string removes the token, returning an array of tokens expands it.
   */
  interface PipelineFunction {
    (token: Token, i: number, tokens: Token[]): Token | Token[] | null | undefined | void
    label?: string
  }

  class Builder {
    constructor ()

    invertedIndex: { [term: string]: any }
    tokenizer: typeof tokenizer
    pipeline: Pipeline
    searchPipeline: Pipeline
    documentCount: number
    termIndex: number
    metadataWhitelist: string[]

    ref (ref: string): void
    field (fieldName: string, attributes?: Builder.FieldAttributes): void
    b (number: number): void
    k1 (number: number): void
    add (doc: object, attributes?: Builder.DocumentAttributes): void
    build (): Index
    use (plugin: Builder.Plugin, ...args: any[]): void
  }

  namespace Builder {
    type Plugin = (this: Builder, builder: Builder, ...args: any[]) => void
    type FieldExtractor = (doc: any) => string | object | object[] | null | undefined

    interface FieldAttributes {
      boost?: number
      extractor?: FieldExtractor
    }

    interface DocumentAttributes {
      boost?: number
    }
  }

  class FieldRef {
    constructor (docRef: string, fieldName: string, stringValue?: string)

    docRef: string
    fieldName: string

    static joiner: string
    static fromString (s: string): FieldRef

    toString (): string
  }

  function idf (posting: object, documentCount: number): number

  class Index {
    constructor (attrs: Index.Attributes)

    invertedIndex: { [term: string]: any }
    fieldVectors: { [fieldRef: string]: Vector }
    tokenSet: TokenSet
    fields: string[]
    pipeline: Pipeline

    search (queryString: Index.QueryString): Index.Result[]
    query (fn: Index.QueryBuilder): Index.Result[]
    toJSON (): Index.SerializedIndex

    static load (serializedIndex: Index.SerializedIndex): Index
  }

  namespace Index {
    type QueryString = string
    type QueryBuilder = (this: Query, query: Query) => void

    interface Attributes {
      invertedIndex: { [term: string]: any }
      fieldVectors: { [fieldRef: string]: Vector }
      tokenSet: TokenSet
      fields: string[]
      pipeline: Pipeline
    }

    interface Result {
      ref: string
      score: number
      matchData: MatchData
    }

    interface SerializedIndex {
      version: string
      fields: string[]
      fieldVectors: Array<[string, number[]]>
      invertedIndex: Array<[string, any]>
      pipeline: string[]
    }
  }

  class MatchData {
    constructor (term?: string, field?: string, metadata?: { [key: string]: any[] })

    metadata: { [term: string]: { [field: string]: { [key: string]: any[] } } }

    combine (otherMatchData: MatchData): void
    add (term: string, field: string, metadata: { [key: string]: any[] }): void
  }

  class Pipeline {
    constructor ()

    static registeredFunctions: { [label: string]: PipelineFunction }
    static registerFunction (fn: PipelineFunction, label: string): void
    static warnIfFunctionNotRegistered (fn: PipelineFunction): void
    static load (serialised: string[]): Pipeline

    add (...functions: PipelineFunction[]): void
    after (existingFn: PipelineFunction, newFn: PipelineFunction): void
    before (existingFn: PipelineFunction, newFn: PipelineFunction): void
    remove (fn: PipelineFunction): void
    run (tokens: Token[]): Token[]
    runString (str: string, metadata?: object): string[]
    reset (): void
    toJSON (): string[]
  }

  class Query {
    constructor (allFields: string[])

    clauses: Query.Clause[]
    allFields: string[]

    clause (clause: Query.ClauseOptions & { term: string }): Query
    isNegated (): boolean
    term (term: string | object | Array<string | object>, options?: Query.ClauseOptions): Query
  }

  namespace Query {
    enum wildcard {
      NONE = 0,
      LEADING = 1,
      TRAILING = 2
    }

    enum presence {
      OPTIONAL = 1,
      REQUIRED = 2,
      PROHIBITED = 3
    }

    interface ClauseOptions {
      fields?: string[]
      boost?: number
      editDistance?: number
      usePipeline?: boolean
      wildcard?: wildcard
      presence?: presence
    }

    interface Clause extends ClauseOptions {
      term: string
      fields: string[]
    }
  }

  class QueryLexer {
    constructor (str: string)

    lexemes: QueryLexer.Lexeme[]

    run (): void

    static EOS: string
    static FIELD: string
    static TERM: string
    static EDIT_DISTANCE: string
    static BOOST: string
    static PRESENCE: string

    static termSeparator: RegExp
    static defaultTermSeparator: RegExp
    static currentTermSeparator (): RegExp
  }

  namespace QueryLexer {
    interface Lexeme {
      type: string
      str: string
      start: number
      end: number
    }
  }

  class QueryParseError extends Error {
    constructor (message: string, start: number, end: number)

    name: string
    message: string
    start: number
    end: number
  }

  class QueryParser {
    constructor (str: string, query: Query)

    query: Query

    parse (): Query
  }

  class Set {
    constructor (elements?: string[])

    elements: { [element: string]: boolean }
    length: number

    static complete: Set
    static empty: Set

    contains (object: string): boolean
    intersect (other: Set): Set
    union (other: Set): Set
  }

  const stemmer: PipelineFunction

  function generateStopWordFilter (stopWords: string[]): PipelineFunction

  const stopWordFilter: PipelineFunction

  class Token {
    constructor (str?: string, metadata?: { [key: string]: any })

    str: string
    metadata: { [key: string]: any }

    toString (): string
    update (fn: Token.UpdateFunction): Token
    clone (fn?: Token.UpdateFunction): Token
  }

  namespace Token {
    type UpdateFunction = (str: string, metadata: { [key: string]: any }) => string
  }

  class TokenSet {
    constructor ()

    final: boolean
    edges: { [char: string]: TokenSet }
    id: number

    static fromArray (arr: string[]): TokenSet
    static fromClause (clause: { term: string, editDistance?: number }): TokenSet
    static fromFuzzyString (str: string, editDistance: number): TokenSet
    static fromString (str: string): TokenSet

    toArray (): string[]
    toString (): string
    intersect (b: TokenSet): TokenSet
  }

  namespace TokenSet {
    class Builder {
      constructor ()

      previousWord: string
      root: TokenSet

      insert (word: string): void
      finish (): void
      minimize (downTo: number): void
    }
  }

  function tokenizer (obj?: string | object | object[] | null, metadata?: { [key: string]: any } | null): Token[]

  namespace tokenizer {
    let separator: RegExp
  }

  const trimmer: PipelineFunction

  namespace utils {
    function warn (message: string): void
    function asString (obj: any): string
    function clone<T> (obj: T): T
  }

  class Vector {
    constructor (elements?: number[])

    elements: number[]

    positionForIndex (index: number): number
    insert (insertIdx: number, val: number): void
    upsert (insertIdx: number, val: number, fn: (existingVal: number, val: number) => number): void
    magnitude (): number
    dot (otherVector: Vector): number
    similarity (otherVector: Vector): number
    toArray (): number[]
    toJSON (): number[]
  }
}

export = lunr
export as namespace lunr
