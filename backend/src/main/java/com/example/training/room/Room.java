package com.example.training.room;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(nullable = false)
    private Integer capacity;

    @Column(length = 200)
    private String notes;

    protected Room() {
    }

    public Room(String name, Integer capacity, String notes) {
        this.name = name;
        this.capacity = capacity;
        this.notes = notes;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public String getNotes() {
        return notes;
    }

    public void update(String name, Integer capacity, String notes) {
        this.name = name;
        this.capacity = capacity;
        this.notes = notes;
    }
}
