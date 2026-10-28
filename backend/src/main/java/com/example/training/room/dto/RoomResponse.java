package com.example.training.room.dto;

import com.example.training.room.Room;

public record RoomResponse(Long id, String name, Integer capacity, String notes) {

    public static RoomResponse from(Room room) {
        return new RoomResponse(room.getId(), room.getName(), room.getCapacity(), room.getNotes());
    }
}
