package in.yapp.Service;

import in.yapp.Entity.User;
import in.yapp.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<UUID, Set<String>> activeSessions = new HashMap<>();


    public synchronized void userOnline(UUID userId, String sessionId) {

        Set<String> sessions =
                activeSessions.computeIfAbsent(
                        userId,
                        ignored -> new HashSet<>()
                );


        boolean wasOffline = sessions.isEmpty();

        sessions.add(sessionId);

        if (!wasOffline) {
            return;
        }

        User user = userRepository.findById(userId)
                .orElseThrow();

        user.setOnline(true);
        userRepository.save(user);

        broadcastPresence(user, true, user.getLastSeen());
    }


    public synchronized void userOffline(UUID userId, String sessionId) {

        Set<String> sessions = activeSessions.get(userId);

        if (sessions == null) {
            return;
        }

        sessions.remove(sessionId);


        if (!sessions.isEmpty()) {
            return;
        }


        activeSessions.remove(userId);

        User user = userRepository.findById(userId)
                .orElseThrow();

        Instant lastSeen = Instant.now();

        user.setOnline(false);
        user.setLastSeen(lastSeen);
        userRepository.save(user);

        broadcastPresence(user, false, lastSeen);
    }


    private void broadcastPresence(
            User user,
            boolean online,
            Instant lastSeen
    ) {

        Map<String, Object> event = new HashMap<>();

        event.put("userId", user.getId());
        event.put("username", user.getUserName());
        event.put("online", online);
        event.put("lastSeen", lastSeen);

        messagingTemplate.convertAndSend(
                "/topic/presence",
                (Object) event
        );
    }
}