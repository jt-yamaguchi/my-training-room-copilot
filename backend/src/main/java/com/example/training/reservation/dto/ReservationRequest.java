package com.example.training.reservation.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;

public record ReservationRequest(
        @NotNull(message = "会議室は必須です")
        Long roomId,
        @NotNull(message = "予約日は必須です")
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate date,
        @NotNull(message = "開始時刻は必須です")
        @JsonFormat(pattern = "HH:mm")
        LocalTime startTime,
        @NotNull(message = "終了時刻は必須です")
        @JsonFormat(pattern = "HH:mm")
        LocalTime endTime,
        @NotBlank(message = "件名は必須です")
        @Size(max = 100, message = "件名は100文字以内で入力してください")
        String title,
        @NotBlank(message = "予約者名は必須です")
        @Size(max = 50, message = "予約者名は50文字以内で入力してください")
        String organizerName) {
}
