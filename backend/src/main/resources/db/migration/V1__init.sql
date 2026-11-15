-- 시각은 DATETIME(6) KST로 저장한다. CHECK 제약은 두지 않는다

CREATE TABLE account (
  account_id     BIGINT       NOT NULL AUTO_INCREMENT,
  username       VARCHAR(20)  NOT NULL,
  nickname       VARCHAR(20)  NOT NULL,
  password_hash  CHAR(60)     NOT NULL,
  token_version  INT          NOT NULL DEFAULT 0,
  last_login_at  DATETIME(6)  NULL,
  created_at     DATETIME(6)  NOT NULL,
  updated_at     DATETIME(6)  NOT NULL,
  PRIMARY KEY (account_id),
  CONSTRAINT uk_account_username UNIQUE (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE account_budget_history (
  account_budget_history_id BIGINT      NOT NULL AUTO_INCREMENT,
  account_id                BIGINT      NOT NULL,
  start_date                DATE        NOT NULL,
  energy_budget             TINYINT     NOT NULL,
  created_at                DATETIME(6) NOT NULL,
  updated_at                DATETIME(6) NOT NULL,
  PRIMARY KEY (account_budget_history_id),
  CONSTRAINT uk_account_budget_history_account_id_start_date UNIQUE (account_id, start_date),
  CONSTRAINT fk_account_budget_history_account_id FOREIGN KEY (account_id)
    REFERENCES account (account_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE account_day_condition (
  account_day_condition_id BIGINT      NOT NULL AUTO_INCREMENT,
  account_id               BIGINT      NOT NULL,
  condition_date           DATE        NOT NULL,
  condition_level          VARCHAR(10) NOT NULL,
  created_at               DATETIME(6) NOT NULL,
  updated_at               DATETIME(6) NOT NULL,
  PRIMARY KEY (account_day_condition_id),
  CONSTRAINT uk_account_day_condition_account_id_condition_date UNIQUE (account_id, condition_date),
  CONSTRAINT fk_account_day_condition_account_id FOREIGN KEY (account_id)
    REFERENCES account (account_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE routine (
  routine_id   BIGINT      NOT NULL AUTO_INCREMENT,
  account_id   BIGINT      NOT NULL,
  name         VARCHAR(20) NOT NULL,
  energy_cost  TINYINT     NOT NULL,
  time_slot    VARCHAR(10) NOT NULL,
  weekdays     TINYINT     NOT NULL,
  start_date   DATE        NOT NULL,
  end_date     DATE        NULL,
  status       VARCHAR(10) NOT NULL,
  created_at   DATETIME(6) NOT NULL,
  updated_at   DATETIME(6) NOT NULL,
  PRIMARY KEY (routine_id),
  CONSTRAINT fk_routine_account_id FOREIGN KEY (account_id)
    REFERENCES account (account_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE task (
  task_id          BIGINT      NOT NULL AUTO_INCREMENT,
  account_id       BIGINT      NOT NULL,
  routine_id       BIGINT      NULL,
  occurrence_date  DATE        NULL,
  name             VARCHAR(20) NULL,
  planned_date     DATE        NOT NULL,
  time_slot        VARCHAR(10) NOT NULL,
  energy_cost      TINYINT     NOT NULL,
  status           VARCHAR(10) NOT NULL,
  is_visible       BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at     DATETIME(6) NULL,
  version          INT         NOT NULL DEFAULT 0,
  created_at       DATETIME(6) NOT NULL,
  updated_at       DATETIME(6) NOT NULL,
  PRIMARY KEY (task_id),
  -- 이번만 할 일은 (NULL, NULL)이라 서로 걸리지 않는다
  CONSTRAINT uk_task_routine_id_occurrence_date UNIQUE (routine_id, occurrence_date),
  INDEX ix_task_account_id_planned_date (account_id, planned_date),
  CONSTRAINT fk_task_account_id FOREIGN KEY (account_id)
    REFERENCES account (account_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_routine_id FOREIGN KEY (routine_id)
    REFERENCES routine (routine_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 옮긴 기록은 고치지 않고(@Immutable) 4주만 보관한다
CREATE TABLE task_move_history (
  task_move_history_id BIGINT      NOT NULL AUTO_INCREMENT,
  task_id              BIGINT      NOT NULL,
  from_date            DATE        NOT NULL,
  from_time_slot       VARCHAR(10) NOT NULL,
  to_date              DATE        NOT NULL,
  to_time_slot         VARCHAR(10) NOT NULL,
  created_at           DATETIME(6) NOT NULL,
  PRIMARY KEY (task_move_history_id),
  CONSTRAINT fk_task_move_history_task_id FOREIGN KEY (task_id)
    REFERENCES task (task_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE share_link (
  share_link_id        BIGINT      NOT NULL AUTO_INCREMENT,
  account_id           BIGINT      NOT NULL,
  -- base64url은 대소문자를 가리므로 이 칸만 이진 비교한다
  token                VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  name                 VARCHAR(20) NOT NULL,
  is_one_time_visible  BOOLEAN     NOT NULL DEFAULT FALSE,
  status               VARCHAR(10) NOT NULL,
  expire_date          DATE        NULL,
  closed_at            DATETIME(6) NULL,
  created_at           DATETIME(6) NOT NULL,
  updated_at           DATETIME(6) NOT NULL,
  PRIMARY KEY (share_link_id),
  CONSTRAINT uk_share_link_token UNIQUE (token),
  CONSTRAINT fk_share_link_account_id FOREIGN KEY (account_id)
    REFERENCES account (account_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE share_link_routine (
  share_link_routine_id BIGINT      NOT NULL AUTO_INCREMENT,
  share_link_id         BIGINT      NOT NULL,
  routine_id            BIGINT      NOT NULL,
  created_at            DATETIME(6) NOT NULL,
  PRIMARY KEY (share_link_routine_id),
  CONSTRAINT uk_share_link_routine_share_link_id_routine_id UNIQUE (share_link_id, routine_id),
  CONSTRAINT fk_share_link_routine_share_link_id FOREIGN KEY (share_link_id)
    REFERENCES share_link (share_link_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_share_link_routine_routine_id FOREIGN KEY (routine_id)
    REFERENCES routine (routine_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 어느 주의 응원인지는 created_at(KST)으로 계산한다. IP는 저장하지 않는다
CREATE TABLE share_link_comment (
  share_link_comment_id BIGINT      NOT NULL AUTO_INCREMENT,
  share_link_id         BIGINT      NOT NULL,
  nickname              VARCHAR(10) NOT NULL,
  body                  VARCHAR(30) NOT NULL,
  created_at            DATETIME(6) NOT NULL,
  PRIMARY KEY (share_link_comment_id),
  INDEX ix_share_link_comment_share_link_id_created_at (share_link_id, created_at),
  CONSTRAINT fk_share_link_comment_share_link_id FOREIGN KEY (share_link_id)
    REFERENCES share_link (share_link_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
