/**
 * Compile-time assertion that type U is assignable to type T.
 * Used for type alignment checks with no runtime cost.
 *
 * @example
 * ```ts
 * // Ensure our type matches the SDK type
 * type _Check = AssertAssignable<SDKType, OurType>
 * ```
 */
export type AssertAssignable<T, U extends T> = U
