<?php
// SmartCase — Connection Test
// Open this in your browser: http://localhost/smartcase/api/test.php
// DELETE this file after confirming everything works.

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

$result = ['php' => PHP_VERSION, 'pdo_mysql' => false, 'db_connect' => false, 'tables' => []];

if (extension_loaded('pdo_mysql')) {
    $result['pdo_mysql'] = true;
    try {
        $pdo = new PDO(
            "mysql:host=localhost;dbname=SmartCaseSystem;charset=utf8",
            "root", "",
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $result['db_connect'] = true;

        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        $result['tables'] = $tables;

        $result['clients_count'] = $pdo->query("SELECT COUNT(*) FROM Clients")->fetchColumn();
        $result['cases_count']   = $pdo->query("SELECT COUNT(*) FROM Cases")->fetchColumn();

    } catch (PDOException $e) {
        $result['db_error'] = $e->getMessage();
    }
} else {
    $result['pdo_error'] = 'pdo_mysql extension not loaded';
}

echo json_encode($result, JSON_PRETTY_PRINT);
