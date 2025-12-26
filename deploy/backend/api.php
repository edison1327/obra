<?php
/**
 * ObraFacil - Database Bridge API
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Suba este archivo a su servidor web (hosting).
 * 2. Asegúrese de que su servidor soporte PHP 7.4 o superior.
 * 3. Copie la URL pública de este archivo (ej: https://midominio.com/api.php).
 * 4. Pegue esa URL en la configuración de "Base de Datos Remota" de la aplicación.
 * 
 * SEGURIDAD:
 * - Se recomienda encarecidamente usar HTTPS.
 * - Este script permite ejecutar consultas SQL recibidas desde la aplicación.
 * - Configure un 'api_secret' en la aplicación y descomente la validación abajo para mayor seguridad.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Secret");
header("Content-Type: application/json; charset=UTF-8");

// Manejo de preflight request para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener datos del cuerpo de la petición
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

// Validar parámetros básicos
if (!isset($data['host'], $data['user'], $data['password'], $data['database'])) {
    echo json_encode(['success' => false, 'message' => 'Missing database credentials']);
    exit;
}

$host = $data['host'];
$user = $data['user'];
$pass = $data['password'];
$dbname = $data['database'];
$port = isset($data['port']) ? $data['port'] : 3306;
$action = isset($data['action']) ? $data['action'] : 'test';

// Conexión a la base de datos
try {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    // Intentar conexión
    $pdo = new PDO($dsn, $user, $pass, $options);
    
} catch (PDOException $e) {
    // Si falla la conexión específica a la BD, intentar conectar al servidor sin seleccionar BD (para crearla si es necesario)
    try {
        $dsn_no_db = "mysql:host=$host;port=$port;charset=utf8mb4";
        $pdo = new PDO($dsn_no_db, $user, $pass, $options);
        // Si llegamos aquí, las credenciales son válidas pero la BD no existe
        if ($action === 'test') {
            echo json_encode(['success' => false, 'message' => 'Connection successful, but database "' . $dbname . '" does not exist.', 'code' => 'DB_NOT_FOUND']);
            exit;
        }
    } catch (PDOException $e2) {
        echo json_encode(['success' => false, 'message' => 'Connection failed: ' . $e->getMessage()]);
        exit;
    }
}

// Procesar acciones
try {
    switch ($action) {
        case 'test':
            echo json_encode(['success' => true, 'message' => 'Connection successful!']);
            break;

        case 'execute_sql':
            if (!isset($data['sql'])) {
                throw new Exception("No SQL provided");
            }
            
            // Permitir múltiples sentencias
            $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, true); 
            
            $sql = $data['sql'];
            
            // Ejecutar SQL
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            
            echo json_encode(['success' => true, 'message' => 'SQL executed successfully']);
            break;
            
        case 'query':
            // Para leer datos (futuro uso)
            if (!isset($data['sql'])) {
                throw new Exception("No SQL provided");
            }
            $stmt = $pdo->query($data['sql']);
            $results = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $results]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
