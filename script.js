let inputEditor1, outputEditor1;
let inputEditor2, outputEditor2;

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
  },
});
require(["vs/editor/editor.main"], function () {
  inputEditor1 = monaco.editor.create(
    document.getElementById("input-editor-1"),
    {
      value: `SELECT SHOP_CODE, CREATE_DATETIME, CREATE_USER_ID, DELETE_DATETIME, DELETE_FLG, DELETE_USER_ID, SHOP_BUSINESS_STATUS, SHOP_GROUP_CODE, SHOP_NAME, SHOP_SEQ_NUMBER, UPDATE_DATETIME, UPDATE_USER_ID FROM MS_SHOP WHERE (((SHOP_CODE = ?) AND (SHOP_GROUP_CODE = ?)) AND (DELETE_FLG = ?))
bind => [null, 0002, 0]`,
      language: "sql",
      theme: "vs",
      fontSize: 14,
      fontFamily: "Courier New, monospace",
      wordWrap: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineNumbers: "on",
      folding: true,
      renderLineHighlight: "line",
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: "line",
      tabSize: 2,
      insertSpaces: true,
    }
  );

  outputEditor1 = monaco.editor.create(
    document.getElementById("output-editor-1"),
    {
      value: "",
      language: "sql",
      theme: "vs",
      fontSize: 14,
      fontFamily: "Courier New, monospace",
      wordWrap: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineNumbers: "on",
      folding: true,
      renderLineHighlight: "none",
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: true,
      cursorStyle: "line",
      tabSize: 2,
      insertSpaces: true,
    }
  );

  inputEditor2 = monaco.editor.create(
    document.getElementById("input-editor-2"),
    {
      value: "",
      language: "sql",
      theme: "vs",
      fontSize: 14,
      fontFamily: "Courier New, monospace",
      wordWrap: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineNumbers: "on",
      folding: true,
      renderLineHighlight: "line",
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: "line",
      tabSize: 2,
      insertSpaces: true,
    }
  );

  outputEditor2 = monaco.editor.create(
    document.getElementById("output-editor-2"),
    {
      value: "",
      language: "sql",
      theme: "vs",
      fontSize: 14,
      fontFamily: "Courier New, monospace",
      wordWrap: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineNumbers: "on",
      folding: true,
      renderLineHighlight: "none",
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: true,
      cursorStyle: "line",
      tabSize: 2,
      insertSpaces: true,
    }
  );

  inputEditor1.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    function () {
      let i = document.getElementById("run-button");
      if (i) {
        i.click();
      }
    }
  );

  inputEditor2.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    function () {
      let i = document.getElementById("run-button");
      if (i) {
        i.click();
      }
    }
  );

  window.addEventListener("resize", () => {
    inputEditor1.layout();
    outputEditor1.layout();
    inputEditor2.layout();
    outputEditor2.layout();
  });
});

function getEditors(editorNumber) {
  if (editorNumber === 1) {
    return { input: inputEditor1, output: outputEditor1 };
  } else if (editorNumber === 2) {
    return { input: inputEditor2, output: outputEditor2 };
  }
  return null;
}

function extractSQLAndBind(input) {
  const lines = input.trim().split("\n");
  let sqlLines = [];
  let bindLine = "";
  let foundBind = false;

  for (const line of lines) {
    if (line.includes("bind =>")) {
      bindLine = line;
      foundBind = true;
    } else if (!foundBind && line.trim()) {
      sqlLines.push(line);
    }
  }

  if (!foundBind) {
    throw new Error("No bind values found in input");
  }

  const sql = sqlLines.join("\n").trim();
  return { sql, bindLine };
}

function parseBindValues(bindLine) {
  const bindMatch = bindLine.match(/bind\s*=>\s*\[\s*(.*?)\s*\]/);
  if (!bindMatch) throw new Error("Invalid bind format");

  const bindContent = bindMatch[1];
  const rawValues = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < bindContent.length; i++) {
    const char = bindContent[i];

    if (!inQuotes && (char === "'" || char === '"')) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      current += char;
    } else if (!inQuotes && char === ",") {
      rawValues.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim() || bindContent.endsWith(",")) {
    rawValues.push(current.trim());
  }

  return rawValues;
}

function bindQueryFromSingleInputForORA(input) {
  const { sql, bindLine } = extractSQLAndBind(input);
  const rawValues = parseBindValues(bindLine);

  let i = 0;
  const result = sql.replace(/\?/g, () => {
    if (i >= rawValues.length) throw new Error("Too few values provided");
    const raw = rawValues[i++];

    if (raw === "null") {
      return "NULL";
    }

    let cleanValue = raw;
    if (
      (cleanValue.startsWith("'") && cleanValue.endsWith("'")) ||
      (cleanValue.startsWith('"') && cleanValue.endsWith('"'))
    ) {
      cleanValue = cleanValue.slice(1, -1);
    }

    if (cleanValue.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/)) {
      return `TO_TIMESTAMP('${cleanValue}', 'YYYY-MM-DD HH24:MI:SS.FF')`;
    }

    if (!isNaN(cleanValue)) {
      return `'${cleanValue}'`;
    }

    const valueStr = cleanValue.replace(/'/g, "''");
    return `'${valueStr}'`;
  });

  const adjustedResult = result
    .replace(/ROWNUM <= '(\d+)'/g, "ROWNUM <= $1")
    .replace(/ROWNUM < '(\d+)'/g, "ROWNUM < $1")
    .replace(/ROWNUM >= '(\d+)'/g, "ROWNUM >= $1")
    .replace(/ROWNUM > '(\d+)'/g, "ROWNUM > $1")
    .replace(/RNUM > '(\d+)'/g, "RNUM > $1")
    .replace(/RNUM < '(\d+)'/g, "RNUM < $1")
    .replace(/rnum > '(\d+)'/g, "rnum > $1")
    .replace(/rnum < '(\d+)'/g, "rnum < $1")
    .replace(/RNUM >= '(\d+)'/g, "RNUM >= $1")
    .replace(/RNUM <= '(\d+)'/g, "RNUM <= $1")
    .replace(/rnum >= '(\d+)'/g, "rnum >= $1")
    .replace(/rnum <= '(\d+)'/g, "rnum <= $1")
    .replace(/rownum >= '(\d+)'/g, "rownum >= $1")
    .replace(/rownum <= '(\d+)'/g, "rownum <= $1")
    .replace(/rownum > '(\d+)'/g, "rownum > $1")
    .replace(/rownum < '(\d+)'/g, "rownum < $1")
    .replace(/(\d+)\s*\+\s*'(\d+)'/g, "$1 + $2");

  return adjustedResult;
}

function bindQueryFromSingleInputForPG(input) {
  const { sql, bindLine } = extractSQLAndBind(input);
  const rawValues = parseBindValues(bindLine);

  let i = 0;
  const result = sql.replace(/\?/g, () => {
    if (i >= rawValues.length) throw new Error("Too few values provided");
    const raw = rawValues[i++];

    if (raw === "null") {
      return "NULL";
    }

    let cleanValue = raw;
    if (
      (cleanValue.startsWith("'") && cleanValue.endsWith("'")) ||
      (cleanValue.startsWith('"') && cleanValue.endsWith('"'))
    ) {
      cleanValue = cleanValue.slice(1, -1);
    }

    const valueStr = cleanValue.replace(/'/g, "''");
    return `'${valueStr}'`;
  });

  const adjustedResult = result
    .replace(/!\s*=/g, "!=")
    .replace(/LIMIT '(\d+)'/g, "LIMIT $1")
    .replace(/OFFSET '(\d+)'/g, "OFFSET $1")
    .replace(/(\d+)\s*-\s*'(\d+)'/g, "$1 - $2");

  return adjustedResult;
}

function processSQL(editorNumber) {
  const editors = getEditors(editorNumber);
  if (!editors || !editors.input || !editors.output) {
    alert(
      `Editors ${editorNumber} are still loading. Please wait a moment and try again.`
    );
    return;
  }

  const input = editors.input.getValue();

  try {
    let rawResult;

    if (input.includes("bind =>")) {
      if (editorNumber === 1) {
        rawResult = bindQueryFromSingleInputForORA(input);
      } else if (editorNumber === 2) {
        rawResult = bindQueryFromSingleInputForPG(input);
      } else {
        throw new Error("Unsupported editor number");
      }
    } else {
      rawResult = input;
    }

    const protectedSQL = rawResult.replace(/\|\|/g, "__CONCAT_OP__");

    const formattedResult = sqlFormatter.format(protectedSQL, {
      language: "sql",
      tabWidth: 2,
      keywordCase: "upper",
      functionCase: "upper",
    });

    const finalResult = formattedResult.replace(/__CONCAT_OP__/g, "||");

    editors.output.setValue(finalResult);
  } catch (error) {
    editors.output.setValue("Error: " + error.message);
  }
}

function copyToClipboard(editorNumber) {
  const editors = getEditors(editorNumber);
  if (!editors || !editors.output) {
    alert(`Output editor ${editorNumber} is not ready yet.`);
    return;
  }

  const text = editors.output.getValue();
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showNotification(`Result ${editorNumber} copied to clipboard!`);
    })
    .catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showNotification(`Result ${editorNumber} copied to clipboard!`);
    });
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.position = "fixed";
  notification.style.bottom = "20px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "#28a745";
  notification.style.color = "white";
  notification.style.padding = "10px 20px";
  notification.style.borderRadius = "5px";
  notification.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
  notification.style.zIndex = "1000";
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 1000);
}

function pasteSQL(editorNumber) {
  const editors = getEditors(editorNumber);
  if (!editors || !editors.input) {
    alert(`Input editor ${editorNumber} is not ready yet.`);
    return;
  }

  navigator.clipboard
    .readText()
    .then((text) => {
      editors.input.setValue(text);
    })
    .catch(() => {
      alert("Failed to paste. Please allow clipboard access.");
    });
}

function resetInput(editorNumber) {
  const editors = getEditors(editorNumber);
  if (!editors || !editors.input || !editors.output) {
    alert(`Editors ${editorNumber} are not ready yet.`);
    return;
  }

  editors.input.setValue("");
  editors.output.setValue("");
}
