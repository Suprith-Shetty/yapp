package in.yapp.Service;

import in.yapp.Entity.User;
import in.yapp.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void userOnline(UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow();

        user.setOnline(true);
        userRepository.save(user);

        Map<String, Object> event = new HashMap<>();
        event.put("userId", user.getId());
        event.put("username", user.getUserName());
        event.put("online", true);
        event.put("lastSeen", user.getLastSeen());

        messagingTemplate.convertAndSend(
                "/topic/presence",
                (Object) event
        );
    }

    public void userOffline(UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow();

        Instant lastSeen = Instant.now();

        user.setOnline(false);
        user.setLastSeen(lastSeen);
        userRepository.save(user);

        Map<String, Object> event = new HashMap<>();
        event.put("userId", user.getId());
        event.put("username", user.getUserName());
        event.put("online", false);
        event.put("lastSeen", lastSeen);

        messagingTemplate.convertAndSend(
                "/topic/presence",
                (Object) event
        );
    }
}