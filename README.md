# Query Binder Tool

A lightweight utility for **binding parameters to SQL queries for Oracle and PostgreSql**, making them easier to debug and understand.

## Replaces `?` placeholders with values from `bind => [...]` arrays and then format the result

<img width="1918" height="1006" alt="image" src="https://github.com/user-attachments/assets/9529ecc8-3073-4ec4-b995-6ad4a5aa2f66" />

## Usage Example

**Input** (log snippet):
```log
[#|2025-07-25T16:03:06.949+0900|FINE|Payara 5.2020.7|org.eclipse.persistence.session./file:/opt/payara/appserver/glassfish/domains/domain1/applications/HontoRspREST/WEB-INF/classes/_REAL.sql|_ThreadID=86;_ThreadName=http-thread-pool::http-listener-1(2);_TimeMillis=1753426986949;_LevelValue=500;|SELECT BUYING_COST, CREATE_DATETIME, CREATE_USER_ID, CUM_STOCKTAKING_LOSS_QTY, CUMULATIVE_ORDER_QUANTITY, CUMULATIVE_RECEIVING_QUANTITY, CUMULATIVE_RETURN_QUANTITY, CUMULATIVE_SALES_QUANTITY, CUMULATIVE_SHOP_RECEIVING_QTY, CUMULATIVE_SHOP_SHIPPING_QTY, DELETE_DATETIME, DELETE_FLG, DELETE_USER_ID, DISCOUNT_PROHIBITION_CATEGORY, FIRST_RECEIVING_DATE, FIRST_RECEIVING_QUANTITY, FIRST_SALES_DATE, KEEP_STOCK_QUANTITY, LAST_BUYING_COST, LAST_BUYING_DATE, LAST_ORDER_DATE, LAST_RETURN_DATE, LAST_SALES_DATE, PRICE_CHANGE, REASONABLE_STOCK_QUANTITY, RETURN_RATE, SHOP_PRICE, SOLDOUT_DATE, SOLDOUT_RATE, SOLDOUT_TIMES, STANDING_FLG, STANDING_RETURN_LIMIT_YMD, STOCK_QUANTITY, UPDATE_DATETIME, UPDATE_USER_ID, SHOP_CODE, JAN_CODE FROM TB_STOCK WHERE ((SHOP_CODE = ?) AND (JAN_CODE = ?)) FOR UPDATE NOWAIT
	bind => [70030, 9784088803265]|#]
```

**Output** (formatted SQL):
```sql
SELECT
  BUYING_COST,
  CREATE_DATETIME,
  CREATE_USER_ID,
  CUM_STOCKTAKING_LOSS_QTY,
  CUMULATIVE_ORDER_QUANTITY,
  CUMULATIVE_RECEIVING_QUANTITY,
  CUMULATIVE_RETURN_QUANTITY,
  CUMULATIVE_SALES_QUANTITY,
  CUMULATIVE_SHOP_RECEIVING_QTY,
  CUMULATIVE_SHOP_SHIPPING_QTY,
  DELETE_DATETIME,
  DELETE_FLG,
  DELETE_USER_ID,
  DISCOUNT_PROHIBITION_CATEGORY,
  FIRST_RECEIVING_DATE,
  FIRST_RECEIVING_QUANTITY,
  FIRST_SALES_DATE,
  KEEP_STOCK_QUANTITY,
  LAST_BUYING_COST,
  LAST_BUYING_DATE,
  LAST_ORDER_DATE,
  LAST_RETURN_DATE,
  LAST_SALES_DATE,
  PRICE_CHANGE,
  REASONABLE_STOCK_QUANTITY,
  RETURN_RATE,
  SHOP_PRICE,
  SOLDOUT_DATE,
  SOLDOUT_RATE,
  SOLDOUT_TIMES,
  STANDING_FLG,
  STANDING_RETURN_LIMIT_YMD,
  STOCK_QUANTITY,
  UPDATE_DATETIME,
  UPDATE_USER_ID,
  SHOP_CODE,
  JAN_CODE
FROM
  TB_STOCK
WHERE
  (
    (SHOP_CODE = '70030')
    AND (JAN_CODE = '9784088803265')
  ) FOR
UPDATE
  NOWAIT
```

## Installation & Usage

### Web Version (Recommended)
1. Use the live demo: [https://sql-query-binder.vercel.app/](https://sql-query-binder.vercel.app/)

### Local Version
1. Clone this repository:
   ```bash
   git clone https://github.com/tanhkoi/sql-query-binder.git
   ```
2. Open `index.html` in any browser

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

*Note: This tool currently supports basic parameter binding. For complex SQL queries with multiple parameter sets, manual verification is recommended.*
