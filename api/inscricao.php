<?php
// Recebe a inscrição (JSON), envia e-mail via Brevo e grava na planilha (Apps Script).
header('Content-Type: application/json; charset=utf-8');

function out($code, $arr) { http_response_code($code); echo json_encode($arr); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false, 'error' => 'method']);

$cfgFile = __DIR__ . '/config.php';
if (!file_exists($cfgFile)) out(500, ['ok' => false, 'error' => 'config']);
$cfg = require $cfgFile;

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) out(400, ['ok' => false, 'error' => 'json']);

// Honeypot anti-bot
if (!empty($in['website'])) out(200, ['ok' => true]);

$fields = ['nome', 'whatsapp', 'email', 'area', 'tamanho',
           'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
$d = [];
foreach ($fields as $f) {
    $d[$f] = trim(mb_substr(strip_tags((string)($in[$f] ?? '')), 0, 200));
}
$d['data_hora'] = date('d/m/Y H:i:s', time() - 3 * 3600); // horário de Brasília

if (mb_strlen($d['nome']) < 3 || !filter_var($d['email'], FILTER_VALIDATE_EMAIL)
    || strlen(preg_replace('/\D/', '', $d['whatsapp'])) < 10) {
    out(422, ['ok' => false, 'error' => 'validation']);
}

function post_json($url, $payload, $headers = []) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json', 'Accept: application/json'], $headers),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true, // Apps Script responde com redirect
        CURLOPT_TIMEOUT => 15,
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, $res];
}

// 1) E-mail via Brevo
$rows = '';
$labels = ['nome' => 'Nome', 'whatsapp' => 'WhatsApp', 'email' => 'E-mail', 'area' => 'Área de atuação',
           'tamanho' => 'Tamanho do escritório', 'utm_source' => 'utm_source', 'utm_medium' => 'utm_medium',
           'utm_campaign' => 'utm_campaign', 'utm_content' => 'utm_content', 'utm_term' => 'utm_term',
           'data_hora' => 'Data/hora'];
foreach ($labels as $k => $label) {
    $rows .= '<tr><td style="padding:6px 12px;border:1px solid #ddd"><b>' . $label . '</b></td>'
           . '<td style="padding:6px 12px;border:1px solid #ddd">' . htmlspecialchars($d[$k]) . '</td></tr>';
}
[$mailCode] = post_json('https://api.brevo.com/v3/smtp/email', [
    'sender'      => ['name' => $cfg['SENDER_NAME'], 'email' => $cfg['SENDER_EMAIL']],
    'to'          => [['email' => $cfg['TO_EMAIL']]],
    'replyTo'     => ['email' => $d['email'], 'name' => $d['nome']],
    'subject'     => 'Nova inscrição · Advocacia de Sucesso 3ª edição — ' . $d['nome'],
    'htmlContent' => '<h3>Nova inscrição</h3><table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' . $rows . '</table>',
], ['api-key: ' . $cfg['BREVO_API_KEY']]);
$mailOk = $mailCode >= 200 && $mailCode < 300;

// 2) Planilha via Apps Script
$sheetOk = false;
if (!empty($cfg['SHEETS_WEBHOOK_URL'])) {
    [$sCode, $sRes] = post_json($cfg['SHEETS_WEBHOOK_URL'], $d + ['secret' => $cfg['SHEETS_SECRET']]);
    $sheetOk = $sCode >= 200 && $sCode < 300 && strpos((string)$sRes, '"ok":true') !== false;
}

if (!$mailOk && !$sheetOk) {
    error_log("inscricao: falha email($mailCode) e planilha");
    out(502, ['ok' => false, 'error' => 'delivery']);
}
if (!$mailOk) error_log("inscricao: falha email Brevo ($mailCode)");
if (!$sheetOk) error_log('inscricao: falha planilha');
out(200, ['ok' => true]);
