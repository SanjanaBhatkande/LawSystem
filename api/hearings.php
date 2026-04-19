<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function callProc($pdo, $sql, $params = []) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    while ($stmt->nextRowset()) { /* drain extra result sets */ }
    return $rows;
}

try {
    if ($method === 'GET' && $action === 'list') {
        $stmt = $pdo->query(
            "SELECT h.*, c.Title AS CaseTitle, c.CaseRef, j.Name AS JudgeName
             FROM Hearings h
             JOIN Cases c  ON h.CaseID  = c.CaseID
             JOIN Judges j ON h.JudgeID = j.JudgeID
             ORDER BY h.HearingDate DESC"
        );
        echo json_encode($stmt->fetchAll());

    } elseif ($method === 'GET' && $action === 'stats') {
        $stmt = $pdo->query("SELECT COUNT(*) AS TotalHearings FROM Hearings");
        echo json_encode($stmt->fetch());

    } elseif ($method === 'GET' && $action === 'judges') {
        $stmt = $pdo->query("SELECT * FROM Judges ORDER BY JudgeID");
        echo json_encode($stmt->fetchAll());

    } elseif ($method === 'POST' && $action === 'add') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) { echo json_encode(['error' => 'Invalid JSON']); exit; }
        // Direct INSERT mirrors Add_Hearing procedure; trigger fires automatically
        $stmt = $pdo->prepare(
            "INSERT INTO Hearings (HearingRef, CaseID, JudgeID, HearingDate, Mode, Room, Status)
             VALUES (:ref, :case, :judge, :date, :mode, :room, :status)"
        );
        $stmt->execute([
            ':ref'    => $data['ref']     ?? '',
            ':case'   => intval($data['caseid']  ?? 0),
            ':judge'  => intval($data['judgeid'] ?? 0),
            ':date'   => $data['date']    ?? '',
            ':mode'   => $data['mode']    ?? 'Offline',
            ':room'   => $data['room']    ?? '',
            ':status' => $data['status']  ?? 'Scheduled',
        ]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);

    } elseif ($method === 'DELETE') {
        $id = intval($_GET['id'] ?? 0);
        if (!$id) { echo json_encode(['error' => 'Missing id']); exit; }
        $pdo->prepare("DELETE FROM Hearings WHERE HearingID = ?")->execute([$id]);
        echo json_encode(['success' => true]);

    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action: ' . $action]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
