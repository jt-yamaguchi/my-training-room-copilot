package com.example.training.reservation.dto;

import java.util.List;

public record ReservationScheduleResponse(
        Long roomId,
        String roomName,
        List<ReservationResponse> reservations) {
}
