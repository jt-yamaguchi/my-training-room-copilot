package com.example.training.room;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void 会議室を登録して一覧取得し情報を更新後削除できる() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"A会議室","capacity":6,"notes":"モニタあり"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("A会議室"))
                .andExpect(jsonPath("$.capacity").value(6))
                .andExpect(jsonPath("$.notes").value("モニタあり"))
                .andReturn();

        Object createdId = com.jayway.jsonpath.JsonPath.read(
                created.getResponse().getContentAsString(), "$.id");
        String roomId = String.valueOf(createdId);

        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("A会議室"));

        mockMvc.perform(put("/api/rooms/{roomId}", roomId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"大会議室","capacity":12,"notes":null}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("大会議室"))
                .andExpect(jsonPath("$.capacity").value(12))
                .andExpect(jsonPath("$.notes").value(nullValue()));

        mockMvc.perform(delete("/api/rooms/{roomId}", roomId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void 必須文字数と数値範囲の違反は登録されず400を返す() throws Exception {
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":" ","capacity":0,"notes":"備考"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + "あ".repeat(51)
                                + "\",\"capacity\":1,\"notes\":null}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"会議室\",\"capacity\":1,\"notes\":\""
                                + "あ".repeat(201) + "\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"会議室","capacity":1.5,"notes":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("リクエスト形式が不正です。"));

        mockMvc.perform(get("/api/rooms"))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void 重複した会議室名は409を返す() throws Exception {
        String room = """
                {"name":"重複会議室","capacity":4,"notes":null}
                """;
        mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(room))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(room))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("会議室名は既に使用されています。"));
    }

    @Test
    void 会議室名の重複と存在しない会議室の更新削除は拒否する() throws Exception {
        String request = """
                {"name":"会議室A","capacity":4,"notes":null}
                """;
        mockMvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated());

        Long roomId = createRoom("会議室B");
        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"会議室C","capacity":4,"notes":null}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/rooms/{roomId}", roomId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict());
        mockMvc.perform(put("/api/rooms/999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/rooms/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void 未来の予約がある会議室は削除できない() throws Exception {
        Long roomId = createRoom("予約あり会議室");
        insertReservation(roomId, LocalDate.now(ZoneId.of("Asia/Tokyo")).plusDays(1), LocalTime.of(10, 0));

        mockMvc.perform(delete("/api/rooms/{roomId}", roomId))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("予約がある会議室は削除できません。"));
        mockMvc.perform(get("/api/rooms"))
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void 過去の予約がある会議室は削除でき予約も削除される() throws Exception {
        Long roomId = createRoom("過去予約会議室");
        insertReservation(roomId, LocalDate.now(ZoneId.of("Asia/Tokyo")).minusDays(1), LocalTime.of(10, 0));

        mockMvc.perform(delete("/api/rooms/{roomId}", roomId))
                .andExpect(status().isNoContent());
        Integer reservationCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM reservations WHERE room_id = ?", Integer.class, roomId);
        org.junit.jupiter.api.Assertions.assertEquals(0, reservationCount);
    }

    private Long createRoom(String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","capacity":4,"notes":null}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private void insertReservation(Long roomId, LocalDate date, LocalTime startTime) {
        jdbcTemplate.update(
                """
                        INSERT INTO reservations
                            (room_id, title, organizer_name, reservation_date, start_time, end_time)
                        VALUES (?, '定例会議', '予約者', ?, ?, ?)
                        """,
                roomId,
                Date.valueOf(date),
                Time.valueOf(startTime),
                Time.valueOf(startTime.plusHours(1)));
    }
}
