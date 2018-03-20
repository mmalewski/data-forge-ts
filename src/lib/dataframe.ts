import { ArrayIterable }  from './iterables/array-iterable';
import { EmptyIterable }  from './iterables/empty-iterable';
import { CountIterable }  from './iterables/count-iterable';
import { MultiIterable }  from './iterables/multi-iterable';
import { SelectIterable }  from './iterables/select-iterable';
import { CsvRowsIterable }  from './iterables/csv-rows-iterable';
import * as Sugar from 'sugar';
import { IIndex, Index } from './index';
import { ExtractElementIterable } from './iterables/extract-element-iterable';
import { SkipIterable } from './iterables/skip-iterable';
const Table = require('easy-table');
import { assert } from 'chai';
import { ISeries, Series, SelectorFn, toMap } from './series';
import { ColumnNamesIterable } from './iterables/column-names-iterable';
import * as BabyParse from 'babyparse';

/**
 * DataFrame configuration.
 */
export interface IDataFrameConfig<IndexT, ValueT> {
    values?: ValueT[] | Iterable<ValueT>,
    index?: IndexT[] | Iterable<IndexT>,
    pairs?: Iterable<[IndexT, ValueT]>,
    columnNames?: string[] | Iterable<string>,
    baked?: boolean,
    considerAllRows?: boolean,
    columns?: any,
};

/**
 * A selector function that can select a series from a dataframe.
 */
export type SeriesSelectorFn<IndexT, DataFrameValueT, SeriesValueT> = (dataFrame: IDataFrame<IndexT, DataFrameValueT>) => ISeries<IndexT, SeriesValueT>;

//
// Helper function to only return distinct items.
//
function makeDistinct<ItemT, KeyT>(items: Iterable<ItemT>, selector?: (item: ItemT) => KeyT): ItemT[] {
    let set: any = {};
    let output: any[] = [];
    for (const item of items) {
        var key = selector && selector(item) || item;
        if (!set[key]) {
            // Haven't yet seen this key.
            set[key] = true;
            output.push(item);
        }
    }

    return output;
}

/**
 * Interface that represents a dataframe.
 */
export interface IDataFrame<IndexT = number, ValueT = any> extends Iterable<ValueT> {

    /**
     * Get an iterator to enumerate the values of the dataframe.
     */
    [Symbol.iterator](): Iterator<ValueT>;

    /**
     * Get the names of the columns in the dataframe.
     * 
     * @returns Returns an array of the column names in the dataframe.  
     */
    getColumnNames (): string[];

    /**
     * Get the index for the dataframe.
     */
    getIndex (): IIndex<IndexT>;

    /**
     * Apply a new index to the DataFrame.
     * 
     * @param newIndex The new index to apply to the DataFrame.
     * 
     * @returns Returns a new dataframe with the specified index attached.
     */
    withIndex<NewIndexT> (newIndex: NewIndexT[] | Iterable<NewIndexT>): IDataFrame<NewIndexT, ValueT>;

    /**
     * Resets the index of the dataframe back to the default zero-based sequential integer index.
     * 
     * @returns Returns a new dataframe with the index reset to the default zero-based index. 
     */
    resetIndex (): IDataFrame<number, ValueT>;
    
    /**
     * Retreive a series from a column of the dataframe.
     *
     * @param columnName Specifies the name of the column that contains the series to retreive.
     */
    getSeries<SeriesValueT> (columnName: string): ISeries<IndexT, SeriesValueT>;

    /**
     * Returns true if the column with the requested name exists in the dataframe.
     *
     * @param columnName - Name of the column to check.
     */
    hasSeries (columnName: string): boolean;

    /**
     * 
     * Verify the existance of a column and return it.
     * Throws an exception if the column doesn't exist.
     *
     * @param columnName - Name or index of the column to retreive.
     */
    expectSeries<SeriesValueT> (columnName: string): ISeries<IndexT, SeriesValueT>;

    /**
     * Create a new dataframe with an additional column specified by the passed-in series.
     *
     * @param columnNameOrSpec - The name of the column to add or replace.
     * @param [series] - When columnNameOrSpec is a string that identifies the column to add, this specifies the Series to add to the data-frame or a function that produces a series (given a dataframe).
     *
     * @returns Returns a new dataframe replacing or adding a particular named column.
     */
    withSeries<SeriesValueT> (columnNameOrSpec: string | any, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT>;
    
    /**
     * Add a series if it doesn't already exist.
     * 
     * @param columnNameOrSpec - The name of the series to add or a column spec that defines the new column.
     * @param series - The series to add to the dataframe. Can also be a function that returns the series.
     * 
     * @returns Returns a new dataframe with the specified series added, if the series didn't already exist. Otherwise if the requested series already exists the same dataframe is returned.  
     */
    ensureSeries<SeriesValueT> (columnNameOrSpec: string | any, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT>;

    /**
    * Extract values from the dataframe as an array.
    * This forces lazy evaluation to complete.
    * 
    * @returns Returns an array of values contained within the dataframe. 
    */
    toArray (): ValueT[];

    /**
     * Retreive the index and values from the DataFrame as an array of pairs.
     * Each pairs is [index, value].
     * 
     * @returns Returns an array of pairs that contains the dataframe content. Each pair is a two element array that contains an index and a value.  
     */
    toPairs (): ([IndexT, ValueT])[];

    /**
     * Bake the data frame to an array of rows.
     * 
     *  @returns Returns an array of rows. Each row is an array of values in column order.   
     */
    toRows (): any[][];
    
    /**
     * Generate a new dataframe based by calling the selector function on each value.
     *
     * @param selector Selector function that transforms each value to create a new dataframe.
     * 
     * @returns Returns a new dataframe that has been transformed by the selector function.
     */
    select<ToT> (selector: SelectorFn<ValueT, ToT>): IDataFrame<IndexT, ToT>;
    
    /**
     * Skip a number of values in the dataframe.
     *
     * @param numValues - Number of values to skip.     * 
     * @returns Returns a new dataframe or dataframe with the specified number of values skipped. 
     */
    skip (numValues: number): IDataFrame<IndexT, ValueT>;

    /** 
     * Format the dataframe for display as a string.
     * This forces lazy evaluation to complete.
     * 
     * @returns Generates and returns a string representation of the dataframe or dataframe.
     */
    toString (): string;

    /**
     * Forces lazy evaluation to complete and 'bakes' the dataframe into memory.
     * 
     * @returns Returns a dataframe that has been 'baked', all lazy evaluation has completed.  
     */
    bake (): IDataFrame<IndexT, ValueT>;

    /**
     * Serialize the dataframe to JSON.
     * 
     *  @returns Returns a JSON format string representing the dataframe.   
     */
    toJSON (): string;

    /**
     * Serialize the dataframe to CSV.
     * 
     *  @returns Returns a CSV format string representing the dataframe.   
     */
    toCSV (): string;
}

/**
 * Class that represents a dataframe of indexed values.
 */
export class DataFrame<IndexT = number, ValueT = any> implements IDataFrame<IndexT, ValueT> {

    private index: Iterable<any>
    private values: Iterable<any>;
    private pairs: Iterable<[any, any]>;
    private columnNames: Iterable<string>;

    //
    // Records if a dataframe is baked into memory.
    //
    private isBaked: boolean = false;

    //
    // Initialise this DataFrame from an array.
    //
    private initFromArray(arr: ValueT[]): void {
        this.index = new CountIterable();
        this.values = arr;
        this.pairs = new MultiIterable([this.index, this.values]);
        if (arr.length > 0) {
            this.columnNames = Object.keys(arr[0]);
        }
        else {
            this.columnNames = [];
        }
    }

    //
    // Initialise an empty DataFrame.
    //
    private initEmpty(): void {
        this.index = new EmptyIterable();
        this.values = new EmptyIterable();
        this.pairs = new EmptyIterable();
        this.columnNames = new EmptyIterable();
    }

    private initColumnNames(inputColumnNames: Iterable<string>): Iterable<string> {
        var outputColumnNames: string[] = [];
        var columnNamesMap: any = {};
    
        // Search for duplicate column names.
        for (let columnName of inputColumnNames) {
            var columnNameLwr = columnName.toLowerCase();
            if (columnNamesMap[columnNameLwr] === undefined) {
                columnNamesMap[columnNameLwr] = 1;
            }
            else {
                columnNamesMap[columnNameLwr] += 1;
            }
        }

        var columnNoMap: any = {};

        for (let columnName of inputColumnNames) {
            var columnNameLwr = columnName.toLowerCase();
            if (columnNamesMap[columnNameLwr] > 1) {
                var curColumnNo = 1;

                // There are duplicates of this column.
                if (columnNoMap[columnNameLwr] !== undefined) {
                    curColumnNo = columnNoMap[columnNameLwr];
                }

                outputColumnNames.push(columnName + "." + curColumnNo);
                columnNoMap[columnNameLwr] = curColumnNo + 1;
            }
            else {
                // No duplicates.
                outputColumnNames.push(columnName);
            }
        }

        return outputColumnNames;
    }

    private initIterable<T>(input: T[] | Iterable<T>, fieldName: string): Iterable<T> {
        if (Sugar.Object.isArray(input)) {
            return input;
        }
        else if (Sugar.Object.isFunction(input[Symbol.iterator])) {
            // Assume it's an iterable.
            return input;
        }
        else {
            throw new Error("Expected '" + fieldName + "' field of DataFrame config object to be an array of values or an iterable of values.");
        }
    };

    //
    // Initialise the DataFrame from a config object.
    //
    private initFromConfig(config: IDataFrameConfig<IndexT, ValueT>): void {

        if (config.columns) {
            assert.isObject(config.columns, "Expected 'columns' member of 'config' parameter to DataFrame constructor to be an object with fields that define columns.");

            const columnNames = Object.keys(config.columns);
            let columnIterables: any[] = [];
            for (let columnName of columnNames) {
                const columnIterable = this.initIterable(config.columns[columnName], columnName);
                columnIterables.push(columnIterable);
            }

            this.columnNames = columnNames;
            this.values = new CsvRowsIterable(columnNames, new MultiIterable(columnIterables));
        }
        else {
            if (config.columnNames) {
                this.columnNames = this.initColumnNames(config.columnNames);
            }

            if (config.values) {
                this.values = this.initIterable<ValueT>(config.values, 'values');
                if (config.columnNames) {
                    // Convert data from rows to columns.
                    this.values = new CsvRowsIterable(this.columnNames, this.values);
                }
                else {
                    this.columnNames = new ColumnNamesIterable(this.values, config.considerAllRows || false);
                }
            }
            else if (config.pairs) {
                this.values = new ExtractElementIterable(config.pairs, 1);
                if (!this.columnNames) {
                    this.columnNames = new ColumnNamesIterable(this.values, config.considerAllRows || false);
                }
            }
            else {
                this.values = new EmptyIterable();
                if (!this.columnNames) {
                    this.columnNames = new EmptyIterable();
                }
            }
        }

        if (config.index) {
            this.index = this.initIterable<IndexT>(config.index, 'index');
        }
        else if (config.pairs) {
            this.index = new ExtractElementIterable(config.pairs, 0);
        }
        else {
            this.index = new CountIterable();
        }


        if (config.pairs) {
            this.pairs = config.pairs;
        }
        else {
            this.pairs = new MultiIterable([this.index, this.values]);
        }

        if (config.baked !== undefined) {
            this.isBaked = config.baked;
        }
    }

    /**
     * Create a dataframe.
     * 
     * @param config This can be either an array or a config object the sets the values that the dataframe contains.
     * If it is an array it specifies the values that the dataframe contains.
     * If it is a config object that can contain:
     *      values: Optional array or iterable of values that the dataframe contains.
     *      index: Optional array or iterable of values that index the dataframe, defaults to a dataframe of integers from 1 and counting upward.
     *      pairs: Optional iterable of pairs (index and value) that the dataframe contains.
     */
    constructor(config?: ValueT[] | IDataFrameConfig<IndexT, ValueT>) {
        if (config) {
            if (Sugar.Object.isArray(config)) {
                this.initFromArray(config);
            }
            else {
                this.initFromConfig(config);
            }
        }
        else {
            this.initEmpty();
        }
    }

    /**
     * Get an iterator to enumerate the values of the dataframe.
     * Enumerating the iterator forces lazy evaluation to complete.
     */
    [Symbol.iterator](): Iterator<any> {
        return this.values[Symbol.iterator]();
    }

    /**
     * Get the names of the columns in the dataframe.
     * 
     * @returns Returns an array of the column names in the dataframe.  
     */
    getColumnNames (): string[] {
        return Array.from(this.columnNames);
    }
    
    /**
     * Get the index for the dataframe.
     */
    getIndex (): IIndex<IndexT> {
        return new Index<IndexT>({ values: this.index });
    }

    /**
     * Apply a new index to the DataFrame.
     * 
     * @param newIndex The new index to apply to the DataFrame.
     * 
     * @returns Returns a new dataframe or dataframe with the specified index attached.
     */
    withIndex<NewIndexT> (newIndex: NewIndexT[] | Iterable<NewIndexT>): IDataFrame<NewIndexT, ValueT> {

        if (!Sugar.Object.isArray(newIndex)) {
            assert.isObject(newIndex, "'Expected 'newIndex' parameter to 'DataFrame.withIndex' to be an array, DataFrame or Index.");
        }

        return new DataFrame<NewIndexT, ValueT>({
            values: this.values,
            index: newIndex,
        });
    }

    /**
     * Resets the index of the dataframe back to the default zero-based sequential integer index.
     * 
     * @returns Returns a new dataframe with the index reset to the default zero-based index. 
     */
    resetIndex (): IDataFrame<number, ValueT> {
        return new DataFrame<number, ValueT>({
            values: this.values // Just strip the index.
        });
    }
    
    /**
     * Retreive a series from a column of the dataframe.
     *
     * @param columnName Specifies the name of the column that contains the series to retreive.
     */
    getSeries<SeriesValueT> (columnName: string): ISeries<IndexT, SeriesValueT> {

        assert.isString(columnName, "Expected 'columnName' parameter to 'DataFrame.getSeries' function to be a string that specifies the name of the column to retreive.");

        return new Series<IndexT, SeriesValueT>({
            values: new SelectIterable<ValueT, SeriesValueT>(
                this.values, 
                (row: any) => row[columnName],
            ),
            index: this.index,
        });   
    }

        /**
     * Returns true if the column with the requested name exists in the dataframe.
     *
     * @param columnName - Name of the column to check.
     */
    hasSeries (columnName: string): boolean {
        var columnNameLwr = columnName.toLowerCase();
        for (let existingColumnName of this.getColumnNames()) {
            if (existingColumnName.toLowerCase() === columnNameLwr) {
                return true;
            }
        }

        return false;
    }
    
    /**
     * 
     * Verify the existance of a column and return it.
     * Throws an exception if the column doesn't exist.
     *
     * @param columnName - Name or index of the column to retreive.
     */
    expectSeries<SeriesValueT> (columnName: string): ISeries<IndexT, SeriesValueT> {
        if (!this.hasSeries(columnName)) {
            throw new Error("Expected dataframe to contain series with column name: '" + columnName + "'.");
        }

        return this.getSeries(columnName);
    }

    /**
     * Create a new dataframe with an additional column specified by the passed-in series.
     *
     * @param columnNameOrSpec - The name of the column to add or replace.
     * @param [series] - When columnNameOrSpec is a string that identifies the column to add, this specifies the Series to add to the data-frame or a function that produces a series (given a dataframe).
     *
     * @returns Returns a new dataframe replacing or adding a particular named column.
     */
    withSeries<SeriesValueT> (columnNameOrSpec: string | any, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT> {

        if (!Sugar.Object.isObject(columnNameOrSpec)) {
            assert.isString(columnNameOrSpec, "Expected 'columnNameOrSpec' parameter to 'DataFrame.withSeries' function to be a string that specifies the column to set or replace.");
            if (!Sugar.Object.isFunction(series as Object)) {
                assert.isObject(series, "Expected 'series' parameter to 'DataFrame.withSeries' to be a Series object or a function that takes a dataframe and produces a Series.");
            }
        }
        else {
            assert.isUndefined(series, "Expected 'series' parameter to 'DataFrame.withSeries' to not be set when 'columnNameOrSpec is an object.");
        }

        if (Sugar.Object.isObject(columnNameOrSpec)) {
            const columnNames = Object.keys(columnNameOrSpec);
            let workingDataFrame: IDataFrame<IndexT, ValueT> = this;
            for (const columnName of columnNames) {
                workingDataFrame = workingDataFrame.withSeries(columnName, columnNameOrSpec[columnName]);
            }

            return workingDataFrame;
        }

        var importSeries: ISeries<IndexT, SeriesValueT>;

        if (Sugar.Object.isFunction(series as Object)) {
            importSeries = (series! as SeriesSelectorFn<IndexT, ValueT, SeriesValueT>)(this);
        }
        else { 
            importSeries = series! as ISeries<IndexT, SeriesValueT>;
        }

        var seriesValueMap = toMap(importSeries.toPairs(), pair => pair[0], pair => pair[1]);
        var newColumnNames =  makeDistinct(this.getColumnNames().concat([columnNameOrSpec])); //TODO: This could be lazy.
        return new DataFrame<IndexT, ValueT>({
            columnNames: newColumnNames,
            index: this.index,
            pairs: new SelectIterable<any, any>(this.pairs, pair => {
                var index = pair[0];
                var value = pair[1];
                var modified = Object.assign({}, value);
                modified[columnNameOrSpec] = seriesValueMap[index];
                return [
                    index,
                    modified
                ];
            }),
        });
    }
    
    /**
     * Add a series if it doesn't already exist.
     * 
     * @param columnNameOrSpec - The name of the series to add or a column spec that defines the new column.
     * @param series - The series to add to the dataframe. Can also be a function that returns the series.
     * 
     * @returns Returns a new dataframe with the specified series added, if the series didn't already exist. Otherwise if the requested series already exists the same dataframe is returned.  
     */
    ensureSeries<SeriesValueT> (columnNameOrSpec: string | any, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT> {

        if (!Sugar.Object.isObject(columnNameOrSpec)) {
            assert.isString(columnNameOrSpec, "Expected 'columnNameOrSpec' parameter to 'DataFrame.ensureSeries' function to be a string that specifies the column to set or replace.");
            if (!Sugar.Object.isFunction(series as Object)) {
                assert.isObject(series, "Expected 'series' parameter to 'DataFrame.ensureSeries' to be a Series object or a function that takes a dataframe and produces a Series.");
            }
        }
        else {
            assert.isUndefined(series, "Expected 'series' parameter to 'DataFrame.ensureSeries' to not be set when 'columnNameOrSpec is an object.");
        }

        if (Sugar.Object.isObject(columnNameOrSpec)) {
            const columnNames = Object.keys(columnNameOrSpec);
            let workingDataFrame = <IDataFrame<IndexT,any>> this;
            for (const columnName of columnNames) {
                workingDataFrame = workingDataFrame.ensureSeries(columnName, columnNameOrSpec[columnName]);
            }

            return workingDataFrame;
        }

        if (this.hasSeries(columnNameOrSpec)) {
            return this; // Already have the series.
        }
        else {
            return this.withSeries(columnNameOrSpec, series);
        }
    }    

    /**
    * Extract values from the dataframe as an array.
    * This forces lazy evaluation to complete.
    * 
    * @returns Returns an array of values contained within the dataframe. 
    */
    toArray (): any[] {
        let values = [];
        for (const value of this.values) {
            values.push(value);
        }
        return values;
    }

    /**
     * Retreive the index and values from the DataFrame as an array of pairs.
     * Each pair is [index, value].
     * This forces lazy evaluation to complete.
     * 
     * @returns Returns an array of pairs that contains the dataframe content. Each pair is a two element array that contains an index and a value.  
     */
    toPairs (): ([IndexT, ValueT])[] {
        let pairs = [];
        for (const pair of this.pairs) {
            pairs.push(pair);
        }
        return pairs;
    }

    /**
     * Bake the data frame to an array of rows.
     * 
     *  @returns Returns an array of rows. Each row is an array of values in column order.   
     */
    toRows (): any[][] {

        const columnNames = this.getColumnNames();
        let rows = [];
        for (const value of this.values) {
            let row = [];
            for (let columnIndex = 0; columnIndex < columnNames.length; ++columnIndex) {
                row.push((<any>value)[columnNames[columnIndex]]);
            }

            rows.push(row);
        }
        
        return rows;
    }

    /**
     * Generate a new dataframe based by calling the selector function on each value.
     *
     * @param selector Selector function that transforms each value to create a new dataframe.
     * 
     * @returns Returns a new dataframe that has been transformed by the selector function.
     */
    select<ToT> (selector: SelectorFn<ValueT, ToT>): IDataFrame<IndexT, ToT> {
        assert.isFunction(selector, "Expected 'selector' parameter to 'DataFrame.select' function to be a function.");

        return new DataFrame({
            values: new SelectIterable(this.values, selector),
            index: this.index,
        });
    }

    /**
     * Skip a number of values in the dataframe.
     *
     * @param numValues - Number of values to skip.     * 
     * @returns Returns a new dataframe or dataframe with the specified number of values skipped. 
     */
    skip (numValues: number): IDataFrame<IndexT, ValueT> {
        return new DataFrame<IndexT, ValueT>({
            values: new SkipIterable(this.values, numValues),
            index: new SkipIterable(this.index, numValues),
            pairs: new SkipIterable(this.pairs, numValues),
        });
    }

    /** 
     * Format the dataframe for display as a string.
     * This forces lazy evaluation to complete.
     * 
     * @returns Generates and returns a string representation of the dataframe or dataframe.
     */
    toString (): string {

        const columnNames = this.getColumnNames();
        const header = ["__index__"].concat(columnNames);
        const pairs = this.toPairs();

        let table = new Table();
        pairs.forEach(function (pair) {
            const index = pair[0];
            const value = pair[1] as any;
            table.cell(header[0], index);
            columnNames.forEach((columnName, columnIndex) => {
                table.cell(header[columnIndex+1], value[columnName]);
            });
            table.newRow();
        });

        return table.toString();
    }

    /**
     * Forces lazy evaluation to complete and 'bakes' the dataframe into memory.
     * 
     * @returns Returns a dataframe that has been 'baked', all lazy evaluation has completed.  
     */
    bake (): IDataFrame<IndexT, ValueT> {

        if (this.isBaked) {
            // Already baked.
            return this;
        }

        return new DataFrame({
            pairs: this.toPairs(),
            baked: true,
        });
    }

    /**
     * Serialize the dataframe to JSON.
     * 
     *  @returns Returns a JSON format string representing the dataframe.   
     */
    toJSON (): string {
        return JSON.stringify(this.toArray(), null, 4);
    }

    /**
     * Serialize the dataframe to CSV.
     * 
     *  @returns Returns a CSV format string representing the dataframe.   
     */
    toCSV (): string {

        const data = [this.getColumnNames()].concat(this.toRows());
        return BabyParse.unparse(data);
    }
}
