-- claude-board 부트스트랩
-- 기존 toy_board 스키마와 Go 앱에는 영향을 주지 않는다.
-- 신규 스키마만 만들고, 계정은 기존 toy 를 그대로 공용한다 (CREATE USER 없음 = 비밀번호 불변).
-- 멱등: 반복 실행해도 안전하다.

CREATE DATABASE IF NOT EXISTS claude_board
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 기존 toy 계정에 신규 스키마 권한만 추가 (toy_board 권한은 그대로 유지된다)
GRANT ALL PRIVILEGES ON claude_board.* TO 'toy'@'localhost';
GRANT ALL PRIVILEGES ON claude_board.* TO 'toy'@'127.0.0.1';

FLUSH PRIVILEGES;
