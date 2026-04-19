<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Helper: fetch first result set from a stored procedure and close cursor
function callProc($pdo, $sql, $params = []) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    // Flush any extra result sets MySQL sends back
    while ($stmt->nextRowset()) { /* drain */ }
    return $rows;
}

try {
    if ($method === 'GET' && $action === 'list') {
        $stmt = $pdo->query(
            "SELECT c.*, cl.Name AS ClientName
             FROM Cases c
             JOIN Clients cl ON c.ClientID = cl.ClientID
             ORDER BY c.CaseID DESC"
        );
        echo json_encode($stmt->fetchAll());

    } elseif ($method === 'GET' && $action === 'dashboard') {
        $stmt = $pdo->query("SELECT * FROM CaseDashboard");
        echo json_encode($stmt->fetchAll());

    } elseif ($method === 'GET' && $action === 'stats') {
        $stmt = $pdo->query("SELECT Priority, COUNT(*) AS TotalCases FROM Cases GROUP BY Priority");
        echo json_encode($stmt->fetchAll());

    } elseif ($method === 'GET' && $action === 'search') {
        $q = $_GET['q'] ?? '';
        $rows = callProc($pdo, "CALL Search_Cases(:q)", [':q' => $q]);
        echo json_encode($rows);

    } elseif ($method === 'GET' && $action === 'filter') {
        $status   = !empty($_GET['status'])   ? $_GET['status']   : null;
        $priority = !empty($_GET['priority']) ? $_GET['priority'] : null;
        $sort     = !empty($_GET['sort'])     ? $_GET['sort']     : null;
        $rows = callProc($pdo, "CALL Filter_Sort_Cases(:s, :p, :o)",
            [':s' => $status, ':p' => $priority, ':o' => $sort]
        );
        echo json_encode($rows);

    } elseif ($method === 'POST' && $action === 'add') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['error' => 'Invalid JSON']); exit; }
        // Direct INSERT mirrors Add_Case procedure
        $stmt = $pdo->prepare(
            "INSERT INTO Cases (CaseRef, Title, Type, Priority, ClientID, FilingDate, Status)
             VALUES (:ref, :title, :type, :priority, :client, CURDATE(), 'Active')"
        );
        $stmt->execute([
            ':ref'      => $data['caseref']  ?? '',
            ':title'    => $data['title']    ?? '',
            ':type'     => $data['type']     ?? 'Civil',
            ':priority' => $data['priority'] ?? 'Medium',
            ':client'   => intval($data['clientid'] ?? 0),
        ]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);

    } elseif ($method === 'DELETE') {
        $id = intval($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['error' => 'Missing id']); exit; }
        $pdo->prepare("DELETE FROM Cases WHERE CaseID = ?")->execute([$id]);
        echo json_encode(['success' => true]);

    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action: ' . $action]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
