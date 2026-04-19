<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    if ($method === 'GET' && $action === 'list') {
        $stmt = $pdo->query("SELECT * FROM Clients ORDER BY ClientID DESC");
        echo json_encode($stmt->fetchAll());

    } elseif ($method === 'GET' && $action === 'stats') {
        $stmt = $pdo->query("SELECT COUNT(*) AS TotalClients FROM Clients");
        echo json_encode($stmt->fetch());

    } elseif ($method === 'POST' && $action === 'add') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['error' => 'Invalid JSON']); exit; }
        // Direct INSERT (mirrors Add_Client procedure) — avoids multi-result-set issues
        $stmt = $pdo->prepare(
            "INSERT INTO Clients (Name, Email, Phone, DocID) VALUES (:name, :email, :phone, :doc)"
        );
        $stmt->execute([
            ':name'  => $data['name']  ?? '',
            ':email' => $data['email'] ?? '',
            ':phone' => $data['phone'] ?? '',
            ':doc'   => $data['docid'] ?? '',
        ]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);

    } elseif ($method === 'DELETE') {
        $id = intval($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['error' => 'Missing id']); exit; }
        $pdo->prepare("DELETE FROM Clients WHERE ClientID = ?")->execute([$id]);
        echo json_encode(['success' => true]);

    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action: ' . $action]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
