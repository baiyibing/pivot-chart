import React, { useMemo, useRef, useState, useEffect } from 'react';
import { DataSource, NestTree, Field, DimensionArea, PivotBaseProps } from './common';
import { createCube, sum } from 'cube-core';
import { momentCube } from 'cube-core/built/core';
import LeftNestGrid from './leftNestGrid';
import TopNestGrid from './topNestGrid';
import CrossTable from './crossTable';
import { getPureNestTree, getCossMatrix, getNestFields, QueryPath } from './utils';
import { StyledTable } from './components/styledTable';
import { getTheme } from './theme';

const theme = getTheme();

interface PivotChartProps extends PivotBaseProps {
  dataSource: DataSource
}
function useMetaTransform(rowList: Field[], columnList: Field[], measureList: Field[]) {
  const rows = useMemo<string[]>(() => rowList.map(f => f.id), [rowList])
  const columns = useMemo<string[]>(() => columnList.map(f => f.id), [columnList])
  const measures = useMemo<string[]>(() => measureList.map(f => f.id), [measureList])
  return { rows, columns, measures }
}
const PivotChart: React.FC<PivotChartProps> = props => {
  const {
    rows: rowList = [],
    columns: columnList = [],
    measures: measureList = [],
    dataSource = [],
    visType = 'number',
    defaultExpandedDepth = {
      rowDepth: 0,
      columnDepth: 1
    },
    showAggregatedNode = {
      [DimensionArea.row]: true,
      [DimensionArea.column]: true
    }
  } = props;
  const {
    rowDepth: defaultRowDepth = 1,
    columnDepth: defaultColumnDepth = 1
  } = defaultExpandedDepth;
  const cubeRef = useRef<momentCube>();
  const [emptyGridHeight, setEmptyGridHeight] = useState<number>(0);
  const [rowLPList, setRowLPList] = useState<string[][]>([]);
  const [columnLPList, setColumnLPList] = useState<string[][]>([]);
  const { rows, columns, measures } = useMetaTransform(rowList, columnList, measureList);
  const {
    nestRows,
    nestColumns,
    dimensionsInView,
    facetMeasures,
    viewMeasures
  } = useMemo(() => {
    return getNestFields(visType, rowList, columnList, measureList)
  }, [rowList, columnList, measureList, visType]);

  useEffect(() => {
    cubeRef.current = createCube({
      type: 'moment',
      factTable: dataSource,
      dimensions: [...rows, ...columns],
      measures,
      aggFunc: sum
    }) as momentCube;
  }, [dataSource, rows, columns, measures])

  // {rows, columns, dimsInVis} = getNestDimensions(visType)
  // getCell(path.concat(dimsInVis))

  const leftNestTree = useMemo<NestTree>(() => {
    return getPureNestTree(dataSource, nestRows.map(r => r.id));
  }, [dataSource, nestRows]);
  const topNestTree = useMemo<NestTree>(() => {
    return getPureNestTree(dataSource, nestColumns.map(c => c.id));
  }, [dataSource, nestColumns]);

  const crossMatrix = useMemo(() => {
    return getCossMatrix(visType, cubeRef.current, rowLPList, columnLPList, rows, columns, measureList, dimensionsInView.map(d => d.id));
  }, [dataSource, rows, columns, measures, rowLPList, columnLPList, visType])
  return (
    <div
      style={{ border: `1px solid ${theme.table.borderColor}`, overflowX: "auto" }}
    >
      <div style={{ display: "flex", flexWrap: "nowrap" }}>
        <div>
          <div
            style={{ height: emptyGridHeight, backgroundColor: theme.table.thead.backgroundColor }}
          ></div>
          <LeftNestGrid
            defaultExpandedDepth={defaultRowDepth}
            visType={visType}
            depth={nestRows.length}
            data={leftNestTree}
            onExpandChange={lpList => {
              setRowLPList(lpList);
            }}
            showAggregatedNode={showAggregatedNode.row}
          />
        </div>
        <StyledTable>
          <TopNestGrid
            defaultExpandedDepth={defaultColumnDepth}
            depth={nestColumns.length}
            measures={measureList}
            data={topNestTree}
            onSizeChange={(w, h) => {
              setEmptyGridHeight(h);
            }}
            onExpandChange={lpList => {
              setColumnLPList(lpList);
            }}
            showAggregatedNode={showAggregatedNode.column}
          />
          <CrossTable
            visType={visType}
            matrix={crossMatrix}
            measures={facetMeasures}
            dimensionsInView={dimensionsInView}
            measuresInView={viewMeasures}
          />
        </StyledTable>
      </div>
    </div>
  );
}

export default PivotChart;
