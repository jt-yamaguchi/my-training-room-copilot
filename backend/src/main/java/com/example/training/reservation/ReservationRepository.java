package com.example.training.reservation;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @Query("""
            SELECT CASE WHEN COUNT(reservation) > 0 THEN true ELSE false END
            FROM Reservation reservation
            WHERE reservation.room.id = :roomId
              AND reservation.date = :date
              AND reservation.startTime < :endTime
              AND reservation.endTime > :startTime
            """)
    boolean existsOverlappingReservation(
            @Param("roomId") Long roomId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);

    @Query("""
            SELECT reservation
            FROM Reservation reservation
            JOIN FETCH reservation.room
            WHERE reservation.date = :date
            ORDER BY reservation.room.name, reservation.startTime, reservation.id
            """)
    List<Reservation> findAllByDateWithRoom(@Param("date") LocalDate date);

    @Query("""
            SELECT reservation
            FROM Reservation reservation
            JOIN FETCH reservation.room
            WHERE reservation.room.id = :roomId
            ORDER BY reservation.date, reservation.startTime, reservation.id
            """)
    List<Reservation> findAllByRoomIdWithRoomOrderByDateAndStartTime(@Param("roomId") Long roomId);
}
