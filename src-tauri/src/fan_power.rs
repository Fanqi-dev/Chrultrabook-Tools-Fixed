//! Track interactive power state separately from the user's selected fan mode.
//! A background S0 wake must not reclaim manual fan control while the screen is off.
#[derive(Clone, Copy, Debug)]
pub enum PowerEvent {
    Display(bool),
    Suspend,
    Resume,
}

pub struct FanPowerState {
    display_on: bool,
    suspended: bool,
}

impl FanPowerState {
    pub const fn new() -> Self {
        Self { display_on: true, suspended: false }
    }

    pub fn active(&self) -> bool { self.display_on && !self.suspended }

    pub fn update(&mut self, event: PowerEvent) -> Option<bool> {
        let was_active = self.active();
        match event {
            PowerEvent::Display(on) => self.display_on = on,
            PowerEvent::Suspend => self.suspended = true,
            PowerEvent::Resume => self.suspended = false,
        }
        let active = self.active();
        (active != was_active).then_some(active)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modern_standby_releases_and_restores_on_display_transition() {
        let mut state = FanPowerState::new();
        assert_eq!(state.update(PowerEvent::Display(false)), Some(false));
        assert!(!state.active());
        assert_eq!(state.update(PowerEvent::Display(true)), Some(true));
    }

    #[test]
    fn background_wake_keeps_firmware_in_control() {
        let mut state = FanPowerState::new();
        state.update(PowerEvent::Display(false));
        state.update(PowerEvent::Suspend);
        assert_eq!(state.update(PowerEvent::Resume), None);
        assert!(!state.active());
        assert_eq!(state.update(PowerEvent::Display(true)), Some(true));
    }

    #[test]
    fn display_on_before_resume_does_not_restore_early() {
        let mut state = FanPowerState::new();
        assert_eq!(state.update(PowerEvent::Suspend), Some(false));
        state.update(PowerEvent::Display(false));
        assert_eq!(state.update(PowerEvent::Display(true)), None);
        assert_eq!(state.update(PowerEvent::Resume), Some(true));
    }

    #[test]
    fn traditional_sleep_without_display_notifications_is_supported() {
        let mut state = FanPowerState::new();
        assert_eq!(state.update(PowerEvent::Suspend), Some(false));
        assert_eq!(state.update(PowerEvent::Resume), Some(true));
    }

    #[test]
    fn duplicate_notifications_do_not_restart_control() {
        let mut state = FanPowerState::new();
        assert_eq!(state.update(PowerEvent::Display(true)), None);
        state.update(PowerEvent::Display(false));
        assert_eq!(state.update(PowerEvent::Display(false)), None);
        state.update(PowerEvent::Display(true));
        assert_eq!(state.update(PowerEvent::Resume), None);
    }
}
