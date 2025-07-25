const editorConfig = {
  common: {
    language: "sql",
    theme: "vs",
    fontSize: 16,
    fontFamily: "Courier New, monospace",
    wordWrap: "on",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    lineNumbers: "on",
    folding: true,
    selectOnLineNumbers: true,
    roundedSelection: false,
    cursorStyle: "line",
    tabSize: 2,
    insertSpaces: true
  },
  input: {
    value: `SELECT SHOP_CODE, CREATE_DATETIME, CREATE_USER_ID, DELETE_DATETIME, DELETE_FLG, DELETE_USER_ID, SHOP_BUSINESS_STATUS, SHOP_GROUP_CODE, SHOP_NAME, SHOP_SEQ_NUMBER, UPDATE_DATETIME, UPDATE_USER_ID FROM MS_SHOP WHERE (((SHOP_CODE = ?) AND (SHOP_GROUP_CODE = ?)) AND (DELETE_FLG = ?))\nbind => [null, 0002, 0]`,
    renderLineHighlight: "line",
    readOnly: false
  },
  output: {
    value: "",
    renderLineHighlight: "none",
    readOnly: true
  }
};

let editors = {
  1: { input: null, output: null },
  2: { input: null, output: null }
};

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs"
  }
});

require(["vs/editor/editor.main"], function() {
  // Initialize editors
  Object.keys(editors).forEach(num => {
    editors[num].input = monaco.editor.create(
      document.getElementById(`input-editor-${num}`),
      { ...editorConfig.common, ...editorConfig.input }
    );
    
    editors[num].output = monaco.editor.create(
      document.getElementById(`output-editor-${num}`),
      { ...editorConfig.common, ...editorConfig.output }
    );

    // Add Ctrl+Enter command
    editors[num].input.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => document.getElementById("run-button")?.click()
    );
  });

  // Handle window resize
  const handleResize = () => Object.values(editors).forEach(({input, output}) => {
    input?.layout();
    output?.layout();
  });
  window.addEventListener("resize", handleResize);
});

function getEditors(editorNumber) {
  return editors[editorNumber] || null;
}

function extractSQLAndBind(input) {
  const bindRegex = /((SELECT|UPDATE|DELETE|INSERT|WITH)[\s\S]+?)\s*bind\s*=>\s*\[([^\]]*)\]/i;
  const match = input.match(bindRegex);
  
  if (match) {
    return {
      sql: match[1].trim(),
      bindLine: `bind => [${match[3]}]`
    };
  }

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

  if (!foundBind) throw new Error("No bind values found in input");

  return {
    sql: sqlLines.join("\n").trim(),
    bindLine
  };
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

function processValueForORA(raw) {
  if (raw === "null") return "NULL";

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

  return `'${cleanValue.replace(/'/g, "''")}'`;
}

function bindQueryFromSingleInputForORA(input) {
  const { sql, bindLine } = extractSQLAndBind(input);
  const rawValues = parseBindValues(bindLine);

  let i = 0;
  const result = sql.replace(/\?/g, () => {
    if (i >= rawValues.length) throw new Error("Too few values provided");
    return processValueForORA(rawValues[i++]);
  });

  return result
    .replace(/(ROWNUM|RNUM|rnum|rownum)\s*([<>]=?)\s*'(\d+)'/g, "$1 $2 $3")
    .replace(/(\d+)\s*[+-]\s*'(\d+)'/g, "$1 $2");
}

function bindQueryFromSingleInputForPG(input) {
  const { sql, bindLine } = extractSQLAndBind(input);
  const rawValues = parseBindValues(bindLine);

  let i = 0;
  const result = sql.replace(/\?/g, () => {
    if (i >= rawValues.length) throw new Error("Too few values provided");
    const raw = rawValues[i++];
    return raw === "null" ? "NULL" : `'${raw.replace(/'/g, "''")}'`;
  });

  return result
    .replace(/!\s*=/g, "!=")
    .replace(/(LIMIT|OFFSET)\s*'(\d+)'/g, "$1 $2")
    .replace(/(\d+)\s*-\s*'(\d+)'/g, "$1 - $2");
}

function processSQL(editorNumber) {
  const editor = editors[editorNumber];
  if (!editor?.input || !editor?.output) {
    alert(`Editors ${editorNumber} are still loading. Please wait and try again.`);
    return;
  }

  const input = editor.input.getValue();

  try {
    let rawResult = input.includes("bind =>")
      ? editorNumber === 1
        ? bindQueryFromSingleInputForORA(input)
        : bindQueryFromSingleInputForPG(input)
      : input;

    const protectedSQL = rawResult.replace(/\|\|/g, "__CONCAT_OP__");
    const formattedResult = sqlFormatter.format(protectedSQL, {
      language: "sql",
      tabWidth: 2,
      keywordCase: "upper",
      functionCase: "upper"
    });

    editor.output.setValue(formattedResult.replace(/__CONCAT_OP__/g, "||"));
  } catch (error) {
    editor.output.setValue(`Error: ${error.message}`);
  }
}

async function copyToClipboard(editorNumber) {
  const editor = editors[editorNumber];
  if (!editor?.output) {
    alert(`Output editor ${editorNumber} is not ready yet.`);
    return;
  }

  const text = editor.output.getValue();
  try {
    await navigator.clipboard.writeText(text);
    showNotification(`Result ${editorNumber} copied to clipboard!`);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    showNotification(`Result ${editorNumber} copied to clipboard!`);
  }
}

function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  Object.assign(notification.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: "#28a745",
    color: "white",
    padding: "10px 20px",
    borderRadius: "5px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    zIndex: "1000"
  });
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 1000);
}

async function pasteSQL(editorNumber) {
  const editor = editors[editorNumber];
  if (!editor?.input) {
    alert(`Input editor ${editorNumber} is not ready yet.`);
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    editor.input.setValue(text);
  } catch {
    alert("Failed to paste. Please allow clipboard access.");
  }
}

function resetInput(editorNumber) {
  const editor = editors[editorNumber];
  if (!editor?.input || !editor?.output) {
    alert(`Editors ${editorNumber} are not ready yet.`);
    return;
  }

  editor.input.setValue("");
  editor.output.setValue("");
}