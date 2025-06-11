function bindQueryFromSingleInput(input) {
    const lines = input.trim().split('\n');

    let sqlLines = [];
    let bindLine = '';
    let foundBind = false;

    for (const line of lines) {
        if (line.includes('bind =>')) {
            bindLine = line;
            foundBind = true;
        } else if (!foundBind && line.trim()) {
            sqlLines.push(line);
        }
    }

    if (!foundBind) {
        throw new Error("No bind values found in input");
    }

    const sql = sqlLines.join('\n').trim();

    const bindMatch = bindLine.match(/bind\s*=>\s*\[\s*(.*?)\s*\]/);
    if (!bindMatch) throw new Error("Invalid bind format");

    const bindContent = bindMatch[1];
    const rawValues = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < bindContent.length; i++) {
        const char = bindContent[i];

        if (!inQuotes && (char === "'" || char === '"')) {
            inQuotes = true;
            quoteChar = char;
            current += char;
        } else if (inQuotes && char === quoteChar) {
            inQuotes = false;
            current += char;
        } else if (!inQuotes && char === ',') {
            rawValues.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        rawValues.push(current.trim());
    }

    let i = 0;
    const result = sql.replace(/\?/g, () => {
        if (i >= rawValues.length) throw new Error("Too few values provided");
        const raw = rawValues[i++];

        if (raw === 'null') {
            return 'NULL';
        }

        let cleanValue = raw;
        if ((cleanValue.startsWith("'") && cleanValue.endsWith("'")) ||
            (cleanValue.startsWith('"') && cleanValue.endsWith('"'))) {
            cleanValue = cleanValue.slice(1, -1);
        }

        const valueStr = cleanValue.replace(/'/g, "''");
        return `'${valueStr}'`;
    });

    return result;
}

function processSQL() {
    const input = document.getElementById('input').value;

    try {
        const rawResult = bindQueryFromSingleInput(input);

        const protectedSQL = rawResult.replace(/\|\|/g, '__CONCAT_OP__');

        const formattedResult = sqlFormatter.format(protectedSQL, {
            language: 'sql',
            tabWidth: 2,
            keywordCase: 'upper',
            functionCase: 'upper'
        });

        const finalResult = formattedResult.replace(/__CONCAT_OP__/g, '||');

        const formattedHighlighted = Prism.highlight(finalResult, Prism.languages.sql, 'sql');
        document.getElementById('formattedResult').innerHTML = `<pre><code class="language-sql">${formattedHighlighted}</code></pre>`;

    } catch (error) {
        document.getElementById('formattedResult').textContent = 'Error: ' + error.message;
    }
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent || element.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#28a745';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    notification.style.zIndex = '1000';
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 500);
}

function pasteSQL() {
    navigator.clipboard.readText().then((text) => {
        document.getElementById('input').value = text;
    }).catch(() => {
        alert('Failed to paste. Please allow clipboard access.');
    });
}

function resetPage() {
    location.reload();
}

document.getElementById('input').value = `SELECT SHOP_CODE, CREATE_DATETIME, CREATE_USER_ID, DELETE_DATETIME, DELETE_FLG, DELETE_USER_ID, SHOP_BUSINESS_STATUS, SHOP_GROUP_CODE, SHOP_NAME, SHOP_SEQ_NUMBER, UPDATE_DATETIME, UPDATE_USER_ID FROM MS_SHOP WHERE (((SHOP_CODE = ?) AND (SHOP_GROUP_CODE = ?)) AND (DELETE_FLG = ?))
bind => [null, 0002, 0]`;