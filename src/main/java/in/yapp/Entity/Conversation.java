package in.yapp.Entity;


import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

import java.time.Instant;
import java.util.UUID;

@Entity(name = "conversations")
@Data
@NoArgsConstructor
public class Conversation
{

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConversationType type;


    @Column(nullable = false,updatable = false)
    private Instant createdAt;


}
