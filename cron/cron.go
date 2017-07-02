package cron

import (
	"time"

	"github.com/robfig/cron"
)

// TODO: Add the job start time and the job end time to measure the performance difference

// Task contains the metadata for our cron application
type Task struct {
	PrevExecution *time.Time `json:"prev_execution,omitempty"`
	NextExecution *time.Time `json:"next_execution,omitempty"`
	StartTime     *time.Time `json:"start_time,omitempty"`
	CurrentTime   *time.Time `json:"current_time,omitempty"`
	JobStartTime  *time.Time `json:"job_start_time,omitempty"`
	JobEndTime    *time.Time `json:"job_end_time,omitempty"`
	IsExecuting   bool       `json:"is_executing"`
	IsRunning     bool       `json:"is_running"`
	Version       string     `json:"version"`
	Counter       int        `json:"counter"`
	JobName       string     `json:"job_name"`
	Spec          string     `json:"spec"`
	Cron          *cron.Cron `json:"-"`
}

// Start will execute the cron scheduler
func (c *Task) Start() {
	t := time.Now()
	if !c.IsRunning {
		c.StartTime = &t
		c.Counter = 0
	}
	c.Cron.Start()
	c.IsRunning = true
}

// Stop will halt the cron scheduler
func (c *Task) Stop() {
	c.Cron.Stop()
	c.IsRunning = false
	c.IsExecuting = false
	c.Counter = 0
}

// Update will refresh the cron metadata
func (c *Task) Update() {

	entries := c.Cron.Entries()
	entry := entries[len(entries)-1]

	c.PrevExecution = &entry.Prev
	c.NextExecution = &entry.Next
	t := time.Now()
	c.CurrentTime = &t
}

// ParseSpec will parse the spec string and returns an error if the format is incorrect
func (c Task) ParseSpec(spec string) error {
	specParser := cron.NewParser(cron.Second | cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	_, err := specParser.Parse(spec)
	return err
}

// New returns a new cron with predefined metadatas
func New(spec string) *Task {
	if spec == "" {
		spec = "0 */10 * * * *"
	}
	t := time.Now()
	return &Task{
		Spec:      spec,
		Cron:      cron.New(),
		Version:   "0.0.1",
		StartTime: &t,
		JobName:   "Loop 10 seconds",
	}
}
